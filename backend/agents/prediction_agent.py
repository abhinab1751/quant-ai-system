import os
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import accuracy_score, f1_score

from models.prediction_model import add_features, FEATURE_COLS
from agents.data_agent import DataAgent

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "saved_models")
os.makedirs(MODEL_DIR, exist_ok=True)


def _model_path(symbol: str) -> str:
    return os.path.join(MODEL_DIR, f"{symbol.upper()}_v2.joblib")


def _build_ensemble() -> Pipeline:
    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=6,
        min_samples_leaf=8,
        max_features="sqrt",
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    gb = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        random_state=42,
    )
    lr = LogisticRegression(
        C=0.5,
        class_weight="balanced",
        max_iter=1000,
        random_state=42,
    )

    voting = VotingClassifier(
        estimators=[("rf", rf), ("gb", gb), ("lr", lr)],
        voting="soft",
        weights=[3, 3, 1],   
    )

    calibrated = CalibratedClassifierCV(voting, cv=3, method="isotonic")

    return Pipeline([
        ("scaler", StandardScaler()),
        ("clf",    calibrated),
    ])


class PredictionAgent:

    def __init__(self):
        self.data_agent = DataAgent()
        self._pipelines: dict[str, Pipeline] = {}


    def train(self, symbol: str, force: bool = False) -> dict:
        path = _model_path(symbol)

        if not force and os.path.exists(path):
            self._pipelines[symbol] = joblib.load(path)
            return {"status": "loaded_from_disk", "symbol": symbol}

        df = self.data_agent.get_historical_data(symbol, period="2y")
        df = add_features(df)

        X, y = df[FEATURE_COLS].values, df["target"].values

        tscv      = TimeSeriesSplit(n_splits=6)
        cv_acc    = []
        cv_f1     = []

        from sklearn.ensemble import RandomForestClassifier as _RF
        quick = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", _RF(n_estimators=100, max_depth=5,
                        class_weight="balanced", random_state=42, n_jobs=-1)),
        ])
        for tr_idx, val_idx in tscv.split(X):
            quick.fit(X[tr_idx], y[tr_idx])
            preds = quick.predict(X[val_idx])
            cv_acc.append(accuracy_score(y[val_idx], preds))
            cv_f1.append(f1_score(y[val_idx], preds, zero_division=0))

        pipeline = _build_ensemble()
        pipeline.fit(X, y)

        joblib.dump(pipeline, path)
        self._pipelines[symbol] = pipeline

        return {
            "status":           "trained",
            "symbol":           symbol,
            "n_features":       len(FEATURE_COLS),
            "n_samples":        len(y),
            "cv_accuracy_mean": round(float(np.mean(cv_acc)), 4),
            "cv_accuracy_std":  round(float(np.std(cv_acc)),  4),
            "cv_f1_mean":       round(float(np.mean(cv_f1)),  4),
        }


    def predict(self, symbol: str) -> tuple[int, float]:
        if symbol not in self._pipelines:
            path = _model_path(symbol)
            if os.path.exists(path):
                self._pipelines[symbol] = joblib.load(path)
            else:
                self.train(symbol)

        pipeline = self._pipelines[symbol]
        df       = self.data_agent.get_historical_data(symbol, period="2y")
        df       = add_features(df)

        latest     = df[FEATURE_COLS].iloc[-1].values.reshape(1, -1)
        prediction = int(pipeline.predict(latest)[0])
        confidence = float(max(pipeline.predict_proba(latest)[0]))

        return prediction, confidence


    def feature_importance(self, symbol: str) -> dict:
        if symbol not in self._pipelines:
            self.train(symbol)
        try:
            calib   = self._pipelines[symbol].named_steps["clf"]
            voting  = calib.calibrated_classifiers_[0].estimator
            rf      = dict(voting.named_estimators_)["rf"]
            imp     = rf.feature_importances_
            return dict(sorted(zip(FEATURE_COLS, imp.tolist()),
                               key=lambda x: x[1], reverse=True))
        except Exception:
            return {}

    def delete_model(self, symbol: str) -> bool:
        path = _model_path(symbol)
        self._pipelines.pop(symbol, None)
        if os.path.exists(path):
            os.remove(path)
            return True
        return False