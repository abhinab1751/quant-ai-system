import pandas as pd
import numpy as np


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    close  = df["Close"]
    high   = df["High"]   if "High"   in df.columns else close
    low    = df["Low"]    if "Low"    in df.columns else close
    volume = df["Volume"] if "Volume" in df.columns else pd.Series(1, index=df.index)

    df["sma_10"]       = close.rolling(10).mean()
    df["sma_50"]       = close.rolling(50).mean()
    df["ema_20"]       = close.ewm(span=20, adjust=False).mean()
    df["sma_ratio"]    = df["sma_10"] / df["sma_50"]
    df["price_vs_ema"] = close / df["ema_20"]

    sma_20            = close.rolling(20).mean()
    std_20            = close.rolling(20).std()
    df["bb_upper"]    = sma_20 + 2 * std_20
    df["bb_lower"]    = sma_20 - 2 * std_20
    df["bb_width"]    = (df["bb_upper"] - df["bb_lower"]) / sma_20
    df["bb_position"] = (close - df["bb_lower"]) / (df["bb_upper"] - df["bb_lower"])

    delta            = close.diff()
    gain             = delta.clip(lower=0).rolling(14).mean()
    loss             = (-delta.clip(upper=0)).rolling(14).mean()
    rs               = gain / loss.replace(0, np.nan)
    df["rsi"]        = 100 - (100 / (1 + rs))
    df["rsi_signal"] = df["rsi"].ewm(span=9, adjust=False).mean()

    ema_12            = close.ewm(span=12, adjust=False).mean()
    ema_26            = close.ewm(span=26, adjust=False).mean()
    df["macd"]        = ema_12 - ema_26
    df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
    df["macd_hist"]   = df["macd"] - df["macd_signal"]

    tr              = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low  - close.shift()).abs(),
    ], axis=1).max(axis=1)
    df["atr"]       = tr.rolling(14).mean()
    df["atr_ratio"] = df["atr"] / close

    low_14          = low.rolling(14).min()
    high_14         = high.rolling(14).max()
    df["stoch_k"]   = 100 * (close - low_14) / (high_14 - low_14).replace(0, np.nan)
    df["stoch_d"]   = df["stoch_k"].rolling(3).mean()

    obv             = (np.sign(close.diff()) * volume).fillna(0).cumsum()
    df["obv_ratio"] = obv / obv.rolling(20).mean().replace(0, np.nan)

    vol_sma             = volume.rolling(10).mean()
    df["volume_ratio"]  = volume / vol_sma.replace(0, np.nan)

    df["returns"]    = close.pct_change()
    df["returns_5"]  = close.pct_change(5)
    df["returns_10"] = close.pct_change(10)

    df["target"] = (close.shift(-1) > close).astype(int)

    return df.dropna()


FEATURE_COLS = [
    "sma_ratio", "price_vs_ema",
    "bb_width", "bb_position",
    "rsi", "rsi_signal",
    "macd_hist",
    "atr_ratio",
    "stoch_k", "stoch_d",
    "obv_ratio",
    "volume_ratio",
    "returns", "returns_5", "returns_10",
]