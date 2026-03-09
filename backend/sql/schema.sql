-- 建议：单独建库
CREATE DATABASE IF NOT EXISTS writing_assistant
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE writing_assistant;

-- 1) 用户表
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB;

-- 2) 文档表
CREATE TABLE IF NOT EXISTS documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL DEFAULT '未命名文档',
  content LONGTEXT NULL,
  content_format VARCHAR(32) NOT NULL DEFAULT 'plain',  -- plain/html/prosemirror_json/markdown 等
  status VARCHAR(32) NOT NULL DEFAULT 'draft',          -- draft/archived
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_documents_user_updated (user_id, updated_at),
  CONSTRAINT fk_documents_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 3) 对话/能力调用记录
CREATE TABLE IF NOT EXISTS chat_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  doc_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role VARCHAR(16) NOT NULL,                 -- user/assistant/system
  ability VARCHAR(32) NOT NULL,              -- outline/expand/polish/proofread/style
  agent_role VARCHAR(32) NULL,               -- planner/writer/reviewer
  content LONGTEXT NOT NULL,
  request_meta JSON NULL,                    -- 模型参数、耗时、token、选区信息等
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chatlogs_doc_created (doc_id, created_at),
  KEY idx_chatlogs_user_created (user_id, created_at),
  CONSTRAINT fk_chatlogs_document
    FOREIGN KEY (doc_id) REFERENCES documents(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_chatlogs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4) Prompt 模板库
CREATE TABLE IF NOT EXISTS prompts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  type VARCHAR(32) NOT NULL,                 -- outline/expand/polish/proofread/style
  name VARCHAR(100) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  template_content LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_prompts_type_active (type, is_active),
  UNIQUE KEY uk_prompts_type_name_version (type, name, version)
) ENGINE=InnoDB;
