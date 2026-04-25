CREATE TABLE IF NOT EXISTS meals (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    time VARCHAR(50) NOT NULL, -- 'morning', 'afternoon', 'evening', 'snacks', 'repository'
    image TEXT,
    date VARCHAR(50), -- Stored as locale date string (e.g., '10/5/2023')
    eaten BOOLEAN DEFAULT FALSE,
    created_at BIGINT -- Stored as timestamp from Date.now()
);

-- Optional: Index for faster queries on date and time since they are frequently filtered
CREATE INDEX idx_meals_date ON meals(date);
CREATE INDEX idx_meals_time ON meals(time);
CREATE INDEX idx_meals_created_at ON meals(created_at DESC);
