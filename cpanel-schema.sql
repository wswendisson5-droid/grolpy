-- ==============================================================================
-- GROPLY / MINHABAGG - ESQUEMA COMPLETO DO BANCO DE DADOS (cPanel / MySQL)
-- ==============================================================================
-- Execute este script no phpMyAdmin do seu cPanel selecionando o banco 'minhabagg_groply'.
-- Ele cria com seguranca todas as tabelas que nao existirem e atualiza colunas existentes.
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABELA DE MIGRACOES
CREATE TABLE IF NOT EXISTS `migrations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(190) NOT NULL UNIQUE,
  `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABELA DE USUARIOS
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(190) NOT NULL UNIQUE,
  `phone` VARCHAR(30) NULL,
  `cpf_cnpj` VARCHAR(20) NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `plan` VARCHAR(30) NOT NULL DEFAULT 'start',
  `role` VARCHAR(20) NOT NULL DEFAULT 'client',
  `status` VARCHAR(30) NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_status` (`status`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABELA DE SESSOES
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `token_hash` CHAR(64) NOT NULL UNIQUE,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_sessions_user` (`user_id`),
  INDEX `idx_sessions_expires` (`expires_at`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABELA DE ASSINATURAS
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `plan_id` VARCHAR(30) NOT NULL DEFAULT 'start',
  `status` VARCHAR(30) NOT NULL DEFAULT 'active',
  `asaas_customer_id` VARCHAR(80) NULL,
  `asaas_subscription_id` VARCHAR(80) NULL,
  `current_payment_id` VARCHAR(80) NULL,
  `next_due_date` DATE NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_subscription_user` (`user_id`),
  INDEX `idx_sub_status` (`status`),
  INDEX `idx_sub_payment` (`current_payment_id`),
  CONSTRAINT `fk_subscription_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABELA DE INSTANCIAS DA EVOLUTION API
CREATE TABLE IF NOT EXISTS `evolution_instances` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `instance_name` VARCHAR(120) NOT NULL UNIQUE,
  `status` VARCHAR(30) NOT NULL DEFAULT 'disconnected',
  `owner_phone` VARCHAR(30) NULL,
  `profile_name` VARCHAR(150) NULL,
  `profile_pic_url` LONGTEXT NULL,
  `last_connected_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_instance_user` (`user_id`),
  INDEX `idx_instance_name` (`instance_name`),
  CONSTRAINT `fk_instance_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABELA DE EVENTOS DE PAGAMENTO (WEBHOOKS ASAAS)
CREATE TABLE IF NOT EXISTS `payment_events` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `event_key` VARCHAR(190) NOT NULL UNIQUE,
  `event_type` VARCHAR(80) NOT NULL,
  `payment_id` VARCHAR(80) NULL,
  `payload_json` LONGTEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_payment_id` (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABELA DE PLANOS
CREATE TABLE IF NOT EXISTS `plans` (
  `id` VARCHAR(30) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `tagline` VARCHAR(190) NULL,
  `price_formatted` VARCHAR(30) NOT NULL,
  `monthly_price` DECIMAL(10,2) NOT NULL,
  `max_groups` INT NOT NULL DEFAULT 20,
  `max_rounds_per_day` INT NOT NULL DEFAULT 1,
  `max_monthly_sends` INT NOT NULL DEFAULT 600,
  `max_active_campaigns` INT NOT NULL DEFAULT 2,
  `history_days` INT NOT NULL DEFAULT 7,
  `support_type` VARCHAR(50) NOT NULL DEFAULT 'E-mail',
  `features_json` LONGTEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABELA DE FATURAS / INVOICES
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `payment_id` VARCHAR(80) NOT NULL UNIQUE,
  `plan_id` VARCHAR(30) NOT NULL,
  `billing_type` VARCHAR(30) NOT NULL DEFAULT 'PIX',
  `value` DECIMAL(10,2) NOT NULL,
  `net_value` DECIMAL(10,2) NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  `due_date` DATE NULL,
  `paid_at` DATETIME NULL,
  `pix_payload` TEXT NULL,
  `pix_image_url` LONGTEXT NULL,
  `boleto_url` VARCHAR(255) NULL,
  `gateway` VARCHAR(30) NOT NULL DEFAULT 'ASAAS',
  `payload_json` LONGTEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_invoices_user` (`user_id`),
  INDEX `idx_invoices_status` (`status`),
  INDEX `idx_invoices_payment` (`payment_id`),
  CONSTRAINT `fk_invoices_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TABELA DE DIVULGACOES / CAMPANHAS (CRITICA - CORRECAO DO ERRO AO SALVAR)
CREATE TABLE IF NOT EXISTS `user_campaigns` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `client_id` VARCHAR(80) NOT NULL,
  `campaign_key` VARCHAR(120) NOT NULL,
  `name` VARCHAR(190) NOT NULL,
  `message` TEXT NULL,
  `media_url` LONGTEXT NULL,
  `config_json` LONGTEXT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'draft',
  `scheduled_at` DATETIME NULL,
  `interval_seconds` INT NOT NULL DEFAULT 30,
  `total_sent` INT NOT NULL DEFAULT 0,
  `total_failed` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_user_campaign` (`user_id`, `campaign_key`),
  INDEX `idx_camp_user` (`user_id`),
  INDEX `idx_camp_client` (`client_id`),
  INDEX `idx_camp_status` (`status`),
  INDEX `idx_camp_sched` (`scheduled_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. TABELA DE HISTORICO DE ENVIOS
CREATE TABLE IF NOT EXISTS `user_history` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `client_id` VARCHAR(80) NOT NULL,
  `campaign_key` VARCHAR(120) NULL,
  `campaign_title` VARCHAR(190) NULL,
  `group_jid` VARCHAR(190) NULL,
  `group_name` VARCHAR(190) NULL,
  `message_text` TEXT NULL,
  `media_url` LONGTEXT NULL,
  `media_type` VARCHAR(30) NULL,
  `duration` VARCHAR(40) NULL,
  `status` VARCHAR(30) NOT NULL,
  `error_text` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_hist_user` (`user_id`),
  INDEX `idx_hist_client` (`client_id`),
  INDEX `idx_hist_campaign` (`campaign_key`),
  INDEX `idx_hist_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. TABELA DE GRUPOS SALVOS DO USUARIO
CREATE TABLE IF NOT EXISTS `user_groups` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `group_jid` VARCHAR(190) NOT NULL,
  `group_name` VARCHAR(190) NULL,
  `members_count` INT NOT NULL DEFAULT 0,
  `selected` TINYINT(1) NOT NULL DEFAULT 1,
  `payload_json` LONGTEXT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_user_group` (`user_id`, `group_jid`),
  INDEX `idx_groups_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. TABELA DE LEADS DO CRM
CREATE TABLE IF NOT EXISTS `crm_leads` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `remote_jid` VARCHAR(190) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `name` VARCHAR(190) NULL,
  `avatar_url` LONGTEXT NULL,
  `tags_json` LONGTEXT NULL,
  `notes` TEXT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'new',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_user_lead` (`user_id`, `remote_jid`),
  INDEX `idx_leads_user` (`user_id`),
  INDEX `idx_leads_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. TABELA DE OPORTUNIDADES DO RADAR IA
CREATE TABLE IF NOT EXISTS `radar_opportunities` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `opp_key` VARCHAR(120) NOT NULL,
  `group_jid` VARCHAR(190) NULL,
  `group_name` VARCHAR(190) NULL,
  `sender_jid` VARCHAR(190) NULL,
  `sender_phone` VARCHAR(30) NULL,
  `sender_name` VARCHAR(190) NULL,
  `message_text` TEXT NULL,
  `confidence_score` INT NOT NULL DEFAULT 0,
  `category` VARCHAR(80) NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'new',
  `ai_analysis_json` LONGTEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_user_opp` (`user_id`, `opp_key`),
  INDEX `idx_opp_user` (`user_id`),
  INDEX `idx_opp_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- ATUALIZACAO SEGURA DE COLUNAS EXISTENTES (ALTER TABLE)
-- ==============================================================================
ALTER TABLE `user_campaigns` MODIFY COLUMN `media_url` LONGTEXT NULL;
ALTER TABLE `user_campaigns` MODIFY COLUMN `config_json` LONGTEXT NULL;

ALTER TABLE `user_history` ADD COLUMN `campaign_title` VARCHAR(190) NULL;
ALTER TABLE `user_history` ADD COLUMN `message_text` TEXT NULL;
ALTER TABLE `user_history` ADD COLUMN `media_url` LONGTEXT NULL;
ALTER TABLE `user_history` ADD COLUMN `media_type` VARCHAR(30) NULL;
ALTER TABLE `user_history` ADD COLUMN `duration` VARCHAR(40) NULL;

ALTER TABLE `evolution_instances` ADD COLUMN `profile_name` VARCHAR(150) NULL;
ALTER TABLE `evolution_instances` ADD COLUMN `profile_pic_url` LONGTEXT NULL;
ALTER TABLE `evolution_instances` ADD COLUMN `last_connected_at` DATETIME NULL;

-- ==============================================================================
-- CARGA INICIAL DE PLANOS (START, PRO, MAX)
-- ==============================================================================
INSERT INTO `plans` (`id`, `name`, `tagline`, `price_formatted`, `monthly_price`, `max_groups`, `max_rounds_per_day`, `max_monthly_sends`, `max_active_campaigns`, `history_days`, `support_type`, `is_active`)
VALUES
  ('start', 'Start', 'Comece a divulgar', '39,90', 39.90, 20, 1, 600, 2, 7, 'E-mail', 1),
  ('pro', 'Pro', 'Mais resultados', '69,90', 69.90, 45, 2, 2700, 5, 30, 'Prioritário', 1),
  ('max', 'Max', 'Sem limites para crescer', '119,90', 119.90, 90, 3, 8100, 10, 90, 'VIP', 1)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `tagline` = VALUES(`tagline`),
  `price_formatted` = VALUES(`price_formatted`),
  `monthly_price` = VALUES(`monthly_price`),
  `max_groups` = VALUES(`max_groups`),
  `max_rounds_per_day` = VALUES(`max_rounds_per_day`),
  `max_monthly_sends` = VALUES(`max_monthly_sends`),
  `max_active_campaigns` = VALUES(`max_active_campaigns`),
  `history_days` = VALUES(`history_days`),
  `support_type` = VALUES(`support_type`);

-- ==============================================================================
-- REGISTRO DE TODAS AS MIGRACOES COMO CONCLUIDAS
-- ==============================================================================
INSERT IGNORE INTO `migrations` (`name`) VALUES
  ('001_users_sessions'),
  ('002_saas_billing_instances'),
  ('003_user_campaigns'),
  ('004_history_payload_groups'),
  ('005_roles_admin'),
  ('006_admin_accounts'),
  ('007_lock_admin_roles'),
  ('008_provision_admin_credentials'),
  ('009_plans_and_invoices'),
  ('010_crm_leads_opportunities'),
  ('011_evolution_profile_columns'),
  ('012_campaign_longtext');

SET FOREIGN_KEY_CHECKS = 1;
