# RDSリソース定義
# PostgreSQLデータベースインスタンスとサブネットグループを作成します
#
# ============================================================
# Wiz検証用の意図的な脆弱性
# ============================================================
# 本ファイルには以下の意図的な設定ミスが含まれています（Wiz検証用）：
# 1. 暗号化が無効化される可能性（storage_encrypted=false）- S04で検出
# 2. パブリックアクセスが許可される可能性（publicly_accessible=true）- S04で検出
# 3. バックアップが無効化される可能性（backup_retention_period=0）- S04で検出
# 4. 削除保護が無効化される可能性（deletion_protection=false）- S04で検出
# 5. Performance Insightsが無効化される可能性 - S04で検出
# 6. 古いPostgreSQLバージョンが使用される可能性 - S04で検出
#
# 本番環境では絶対に使用しないでください
# ============================================================

# DBサブネットグループ
resource "aws_db_subnet_group" "main" {
  name       = "${var.environment}-taskflow-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = merge(
    var.common_tags,
    {
      Name = "${var.environment}-taskflow-db-subnet-group"
    }
  )
}

# DBパラメータグループ
resource "aws_db_parameter_group" "main" {
  name        = "${var.environment}-taskflow-postgres15"
  family      = "postgres15"
  description = "Custom parameter group for TaskFlow PostgreSQL 15"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${var.environment}-taskflow-postgres15"
    }
  )
}

# RDSインスタンス
resource "aws_db_instance" "main" {
  identifier     = "${var.environment}-taskflow-db"
  engine         = "postgres"
  engine_version = var.engine_version

  instance_class        = var.instance_class
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = var.storage_type
  storage_encrypted     = var.storage_encrypted
  kms_key_id            = var.kms_key_arn

  db_name  = var.database_name
  username = var.master_username
  password = var.master_password
  port     = var.database_port

  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.main.name
  vpc_security_group_ids = [var.security_group_id]

  multi_az                = var.multi_az
  publicly_accessible     = var.publicly_accessible
  backup_retention_period = var.backup_retention_period
  backup_window           = var.backup_window
  maintenance_window      = var.maintenance_window

  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports

  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.environment}-taskflow-db-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  performance_insights_enabled          = var.performance_insights_enabled
  performance_insights_kms_key_id       = var.performance_insights_kms_key_id
  performance_insights_retention_period = var.performance_insights_retention_period

  copy_tags_to_snapshot      = true
  auto_minor_version_upgrade = var.auto_minor_version_upgrade

  tags = merge(
    var.common_tags,
    {
      Name = "${var.environment}-taskflow-db"
    }
  )
}

# CloudWatch アラーム - CPU使用率
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  count               = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name          = "${var.environment}-taskflow-db-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU使用率が80%を超えています"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = var.common_tags
}

# CloudWatch アラーム - ストレージ容量
resource "aws_cloudwatch_metric_alarm" "database_storage" {
  count               = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name          = "${var.environment}-taskflow-db-storage-space"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10000000000 # 10GB
  alarm_description   = "RDS空きストレージが10GB未満です"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = var.common_tags
}

# CloudWatch アラーム - 接続数
resource "aws_cloudwatch_metric_alarm" "database_connections" {
  count               = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name          = "${var.environment}-taskflow-db-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS接続数が多すぎます"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = var.common_tags
}
