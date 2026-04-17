import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import TimeSeriesSplit

from models.prediction_model import add_features, FEATURE_COLS

MIN_TRAIN_ROWS  = 60    
WARMUP_ROWS     = 20    
CONF_PERCENTILE = 50    
RF_PARAMS = dict(
    n_estimators     = 200,
    max_depth        = 6,
    min_samples_leaf = 6,
    max_features     = "sqrt",
    class_weight     = "balanced",
    random_state     = 42,
)


class BacktestEngine:

    def __init__(self, initial_capital: float = 10_000.0):
        self.initial_capital = initial_capital


    def run(self, df: pd.DataFrame) -> dict:
        df = add_features(df.copy())
        df = df.reset_index(drop=False)

        needed = MIN_TRAIN_ROWS + WARMUP_ROWS + 30
        if len(df) < needed:
            raise ValueError(
                f"Need ≥{needed} rows after feature engineering, "
                f"got {len(df)}. Use period='1y' or '2y'."
            )

        results = self._simulate(df)
        metrics = self._compute_metrics(results["equity_curve"], results["trades"])
        return {**metrics, **results}


    def _simulate(self, df: pd.DataFrame) -> dict:
        X_all  = df[FEATURE_COLS].values
        y_all  = df["target"].values
        closes = df["Close"].values

        for col in ("Date", "index", "Datetime"):
            if col in df.columns:
                dates = pd.to_datetime(df[col]).dt.strftime("%Y-%m-%d").tolist()
                break
        else:
            dates = [str(i) for i in range(len(df))]

        equity_curve             = [self.initial_capital]
        trades                   = []
        cash                     = self.initial_capital
        position                 = 0.0
        entry_price              = 0.0
        recent_confs: list[float] = []
        pipe: Pipeline | None    = None
        last_fit_at              = 0   

        for i in range(MIN_TRAIN_ROWS, len(df) - 1):
            if pipe is None or (i - last_fit_at) >= 30:
                X_tr = X_all[:i]
                y_tr = y_all[:i]
                if len(np.unique(y_tr)) < 2:
                    equity_curve.append(round(self._pv(cash, position, closes[i]), 4))
                    continue
                pipe = Pipeline([
                    ("scaler", StandardScaler()),
                    ("clf",    RandomForestClassifier(**RF_PARAMS)),
                ])
                pipe.fit(X_tr, y_tr)
                last_fit_at = i

            x_today = X_all[i].reshape(1, -1)
            pred    = int(pipe.predict(x_today)[0])
            proba   = pipe.predict_proba(x_today)[0]
            conf    = float(max(proba))

            recent_confs.append(conf)
            if len(recent_confs) > WARMUP_ROWS:
                recent_confs.pop(0)
            threshold = (
                float(np.percentile(recent_confs, CONF_PERCENTILE))
                if len(recent_confs) >= WARMUP_ROWS else 0.50
            )

            today_close    = float(closes[i])
            tomorrow_close = float(closes[i + 1])

            if pred == 1 and conf >= threshold:
                if position == 0 and cash > 0:
                    shares      = cash / today_close
                    position    = shares
                    entry_price = today_close
                    cash        = 0.0
                    trades.append({
                        "date":      dates[i],
                        "action":    "BUY",
                        "price":     round(today_close, 4),
                        "shares":    round(shares, 6),
                        "conf":      round(conf, 4),
                        "threshold": round(threshold, 4),
                    })
            else:
                if position > 0:
                    proceeds = position * today_close
                    pnl      = proceeds - (position * entry_price)
                    trades.append({
                        "date":      dates[i],
                        "action":    "SELL",
                        "price":     round(today_close, 4),
                        "shares":    round(position, 6),
                        "pnl":       round(pnl, 4),
                        "conf":      round(conf, 4),
                        "threshold": round(threshold, 4),
                    })
                    cash     = proceeds
                    position = 0.0

            equity_curve.append(
                round(self._pv(cash, position, tomorrow_close), 4)
            )

        if position > 0:
            last_close = float(closes[-1])
            proceeds   = position * last_close
            pnl        = proceeds - (position * entry_price)
            trades.append({
                "date":   dates[-1],
                "action": "SELL (final)",
                "price":  round(last_close, 4),
                "shares": round(position, 6),
                "pnl":    round(pnl, 4),
            })
            equity_curve[-1] = round(proceeds, 4)

        return {"equity_curve": equity_curve, "trades": trades}


    def _compute_metrics(self, equity_curve: list, trades: list) -> dict:
        curve        = np.array(equity_curve, dtype=float)
        final_value  = float(curve[-1])
        total_return = (final_value - self.initial_capital) / self.initial_capital * 100

        daily_rets = np.diff(curve) / np.where(curve[:-1] != 0, curve[:-1], np.nan)
        daily_rets = daily_rets[np.isfinite(daily_rets)]

        sharpe = 0.0
        if len(daily_rets) > 1 and daily_rets.std() > 0:
            sharpe = float((daily_rets.mean() / daily_rets.std()) * np.sqrt(252))

        peak         = np.maximum.accumulate(curve)
        drawdowns    = np.where(peak != 0, (curve - peak) / peak * 100, 0.0)
        max_drawdown = float(drawdowns.min())

        sell_trades = [t for t in trades if "pnl" in t]
        win_rate    = 0.0
        if sell_trades:
            wins     = sum(1 for t in sell_trades if t["pnl"] > 0)
            win_rate = wins / len(sell_trades) * 100

        return {
            "initial_capital":   self.initial_capital,
            "final_value":       round(final_value, 2),
            "total_return_pct":  round(total_return, 2),
            "sharpe_ratio":      round(sharpe, 4),
            "max_drawdown_pct":  round(max_drawdown, 2),
            "win_rate_pct":      round(win_rate, 2),
            "total_trades":      len(sell_trades),
        }

    @staticmethod
    def _pv(cash: float, position: float, price: float) -> float:
        return cash + position * price