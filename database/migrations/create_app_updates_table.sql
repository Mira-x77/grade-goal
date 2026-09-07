-- App Updates Table
CREATE TABLE app_updates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    version_name VARCHAR(50) NOT NULL, -- e.g., "1.2.3"
    version_code INT NOT NULL, -- e.g., 123 (for comparison)
    apk_file_path VARCHAR(255) NOT NULL,
    apk_file_size BIGINT NOT NULL,
    release_notes TEXT NOT NULL,
    bug_fixes TEXT,
    new_features TEXT,
    is_mandatory BOOLEAN DEFAULT FALSE,
    min_supported_version INT, -- Minimum version that can update to this
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Index for faster version lookups
CREATE INDEX idx_version_code ON app_updates(version_code);
CREATE INDEX idx_active_updates ON app_updates(is_active, version_code);