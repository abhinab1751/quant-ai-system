from agents.data_agent import DataAgent
from agents.backtest_agent import BacktestAgent
from agents.decision_agent import decide_action
from models.prediction_model import add_features

def test_backtest():
    data_agent = DataAgent()
    backtest = BacktestAgent()

    print("Fetching data...")
    df = data_agent.get_historical_data("AAPL")

    print("Adding features...")
    df = add_features(df)

    print("Running backtest...")
    equity_curve = backtest.run_backtest(df, decide_action)

    print("Final Portfolio Value:", round(equity_curve[-1], 2))
    print("Total Steps:", len(equity_curve))

if __name__ == "__main__":
    test_backtest()