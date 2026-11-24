-- ==============================================================================
-- ASSETFLOW ENTERPRISE ERP - MOTOR DE BASE DE DATOS RELACIONAL PARTICIONADA
-- Estándar: PostgreSQL 16 Enterprise / ISO 9001:2015 / ISO/IEC 27001
-- Capacidad Diseñada: >36.000.000 de Transacciones Contables F0911 (10 Años a 10.000 tx/día)
-- Propietario del Sistema: Cristian Andrés Muñoz Rojas (samaheim@gmail.com)
-- ==============================================================================

-- 1. EXTENSIONES DE RENDIMIENTO Y SEGURIDAD CRIPTOGRÁFICA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLA MAESTRA DE TRANSACCIONES F0911 CON PARTICIONAMIENTO MENSUAL
-- ==============================================================================
CREATE TABLE IF NOT EXISTS f0911_transactions (
    id VARCHAR(64) NOT NULL,
    date DATE NOT NULL,
    invoice_date DATE,
    amount NUMERIC(15, 2) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100) DEFAULT 'GENERAL',
    document_type VARCHAR(50),
    document_number VARCHAR(50),
    description VARCHAR(2000) NOT NULL,
    user_creator VARCHAR(100) NOT NULL,
    timestamp BIGINT NOT NULL,
    supplier_id VARCHAR(64),
    supplier_name VARCHAR(200),
    supplier_tax_id VARCHAR(30),
    property_id VARCHAR(64),
    account_code VARCHAR(30),
    insurance_company VARCHAR(100),
    work_order_id VARCHAR(64),
    status VARCHAR(30) DEFAULT 'CONTABILIZADO',
    batch_number VARCHAR(50),
    program_id VARCHAR(20) DEFAULT 'P0911',
    work_station_id VARCHAR(50) DEFAULT 'WK_SRV_01',
    next_number_seq INTEGER,
    hash_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, date)
) PARTITION BY RANGE (date);

-- ==============================================================================
-- 3. PARTICIONES MENSUALES FÍSICAS (AÑO 2026 - 2028)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS f0911_tx_2026_01 PARTITION OF f0911_transactions FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2026_02 PARTITION OF f0911_transactions FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2026_03 PARTITION OF f0911_transactions FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2026_04 PARTITION OF f0911_transactions FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2026_05 PARTITION OF f0911_transactions FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2026_06 PARTITION OF f0911_transactions FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2026_07 PARTITION OF f0911_transactions FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2026_08 PARTITION OF f0911_transactions FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2026_09 PARTITION OF f0911_transactions FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2026_10 PARTITION OF f0911_transactions FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2026_11 PARTITION OF f0911_transactions FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2026_12 PARTITION OF f0911_transactions FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Particiones 2027
CREATE TABLE IF NOT EXISTS f0911_tx_2027_01 PARTITION OF f0911_transactions FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2027_02 PARTITION OF f0911_transactions FOR VALUES FROM ('2027-02-01') TO ('2027-03-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2027_03 PARTITION OF f0911_transactions FOR VALUES FROM ('2027-03-01') TO ('2027-04-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2027_04 PARTITION OF f0911_transactions FOR VALUES FROM ('2027-04-01') TO ('2027-05-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2027_05 PARTITION OF f0911_transactions FOR VALUES FROM ('2027-05-01') TO ('2027-06-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2027_06 PARTITION OF f0911_transactions FOR VALUES FROM ('2027-06-01') TO ('2027-07-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2027_07 PARTITION OF f0911_transactions FOR VALUES FROM ('2027-07-01') TO ('2027-08-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2027_08 PARTITION OF f0911_transactions FOR VALUES FROM ('2027-08-01') TO ('2027-09-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2027_09 PARTITION OF f0911_transactions FOR VALUES FROM ('2027-09-01') TO ('2027-10-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2027_10 PARTITION OF f0911_transactions FOR VALUES FROM ('2027-10-01') TO ('2027-11-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2027_11 PARTITION OF f0911_transactions FOR VALUES FROM ('2027-11-01') TO ('2027-12-01');
CREATE TABLE IF NOT EXISTS f0911_tx_2027_12 PARTITION OF f0911_transactions FOR VALUES FROM ('2027-12-01') TO ('2028-01-01');

-- Partición por defecto para fechas futuras / contingencia
CREATE TABLE IF NOT EXISTS f0911_tx_default PARTITION OF f0911_transactions DEFAULT;

-- ==============================================================================
-- 4. ÍNDICES B-TREE COMPUESTOS PARA CONSULTAS SUB-SEGUNDO (<15 ms)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_f0911_date_type ON f0911_transactions (date DESC, type);
CREATE INDEX IF NOT EXISTS idx_f0911_category ON f0911_transactions (category);
CREATE INDEX IF NOT EXISTS idx_f0911_supplier_tax_id ON f0911_transactions (supplier_tax_id);
CREATE INDEX IF NOT EXISTS idx_f0911_account_code ON f0911_transactions (account_code);
CREATE INDEX IF NOT EXISTS idx_f0911_batch_number ON f0911_transactions (batch_number);
CREATE INDEX IF NOT EXISTS idx_f0911_work_order_id ON f0911_transactions (work_order_id);
CREATE INDEX IF NOT EXISTS idx_f0911_hash_signature ON f0911_transactions (hash_signature);

-- ==============================================================================
-- 5. TABLA INMUTABLE DE AUDITORÍA FORENSE WORM (F980011D)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS f980011d_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registry_id VARCHAR(64) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    program_id VARCHAR(20) NOT NULL,
    work_station_id VARCHAR(50) NOT NULL,
    next_number_seq INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,
    user_creator VARCHAR(100) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    hash_signature VARCHAR(128) NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_registry_id ON f980011d_audit_trail (registry_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON f980011d_audit_trail (created_at DESC);

-- Regla de inmutabilidad: Bloquear UPDATE y DELETE en bitácora de auditoría
CREATE OR REPLACE RULE no_update_audit AS ON UPDATE TO f980011d_audit_trail DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_delete_audit AS ON DELETE TO f980011d_audit_trail DO INSTEAD NOTHING;

-- ==============================================================================
-- 6. VISTA MATERIALIZADA PARA AGREGACIONES CONTABLES Y BALANCES INSTANTÁNEOS
-- ==============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS v_f0911_monthly_kpis AS
SELECT
    TO_CHAR(date, 'YYYY-MM') AS month_label,
    type,
    category,
    COUNT(*) AS total_count,
    SUM(amount) AS total_amount,
    MIN(amount) AS min_amount,
    MAX(amount) AS max_amount,
    AVG(amount) AS avg_amount
FROM f0911_transactions
GROUP BY TO_CHAR(date, 'YYYY-MM'), type, category;

CREATE UNIQUE INDEX IF NOT EXISTS idx_v_f0911_monthly_kpis ON v_f0911_monthly_kpis (month_label, type, category);

-- Comentario institucional
COMMENT ON TABLE f0911_transactions IS 'Libro Mayor y Diario de Transacciones F0911 con Particionamiento Mensual Nativo (ISO 9001:2015)';
