SELECT
    symbol,
    COUNT(*) AS total_rows,
    COUNT(*) - COUNT(DISTINCT date_trunc('minute', fetched_at) / 5 * 5) AS duplicate_rows
FROM price
GROUP BY symbol
ORDER BY duplicate_rows DESC;

BEGIN;

WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY
                symbol,
                (EXTRACT(EPOCH FROM fetched_at)::bigint / 300)   
            ORDER BY fetched_at DESC
        ) AS rn
    FROM price
)
DELETE FROM price
WHERE id IN (
    SELECT id FROM ranked WHERE rn > 1
);

COMMIT;

SELECT symbol, COUNT(*) AS rows_remaining
FROM price
GROUP BY symbol
ORDER BY symbol;

VACUUM ANALYZE price;