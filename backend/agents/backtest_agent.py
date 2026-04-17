class BacktestAgent:

    def run_backtest(self, df, decision_fn, initial_capital=10000.0):

        capital = float(initial_capital)
        position = 0.0
        equity_curve = []
        trade_count = 0

        if df.empty:
            return {
                "initial_capital": round(float(initial_capital), 2),
                "final_equity": round(float(initial_capital), 2),
                "total_return_pct": 0.0,
                "max_drawdown_pct": 0.0,
                "trade_count": 0,
                "equity_curve": [],
            }

        for i in range(50, len(df)):
            row = df.iloc[i]

            ml_prediction = "UP" if row["target"] == 1 else "DOWN"
            ml_confidence = 0.6

            sentiment = "NEUTRAL"
            sentiment_confidence = 0.0

            decision = decision_fn(
                ml_prediction,
                ml_confidence,
                sentiment,
                sentiment_confidence
            )

            price = row["Close"]

            if decision["action"] == "BUY" and capital > 0:
                position = capital / price
                capital = 0
                trade_count += 1

            elif decision["action"] == "SELL" and position > 0:
                capital = position * price
                position = 0
                trade_count += 1

            total_value = capital + position * price
            equity_curve.append(float(total_value))

        if position > 0:
            final_price = float(df.iloc[-1]["Close"])
            capital = position * final_price
            position = 0

        final_equity = float(capital)
        total_return_pct = ((final_equity / float(initial_capital)) - 1.0) * 100.0

        peak = equity_curve[0]
        max_drawdown = 0.0
        for value in equity_curve:
            if value > peak:
                peak = value
            drawdown = ((peak - value) / peak) if peak > 0 else 0.0
            if drawdown > max_drawdown:
                max_drawdown = drawdown

        return {
            "initial_capital": round(float(initial_capital), 2),
            "final_equity": round(final_equity, 2),
            "total_return_pct": round(total_return_pct, 2),
            "max_drawdown_pct": round(max_drawdown * 100.0, 2),
            "trade_count": trade_count,
            "equity_curve": [round(v, 2) for v in equity_curve],
        }