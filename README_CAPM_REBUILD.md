# CAPM Mutual Fund Research Workbench

## Files

- `capm_dashboard_reconstructed.py` - rebuilt Streamlit app
- `requirements_capm_rebuild.txt` - required Python packages

## Run

```powershell
pip install -r requirements_capm_rebuild.txt
streamlit run capm_dashboard_reconstructed.py
```

## Rebuild Scope

- No sidebar; all workflows use top page navigation.
- AI, news, and asset allocation are removed.
- CAPM calculations follow the Excel-style logic: average periodic return annualized, SLOPE-equivalent beta, CAPM expected return, Jensen alpha, Sharpe, Sortino, Treynor, tracking error, drawdown, and CAGR.
- Export produces a research workbook with executive summary, assumptions, formula audit, metrics dashboard, charts, and raw return data.
