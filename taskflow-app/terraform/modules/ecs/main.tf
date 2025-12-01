# ECSリソース定義
# ECSクラスター、サービス、タスク定義、ALBを作成します
#
# ============================================================
# Wiz検証用の意図的な脆弱性
# ============================================================
# 本ファイルには以下の意図的な設定ミスが含まれています（Wiz検証用）：
# 1. Container Insightsが無効化される可能性（S04で検出）
# 2. ALBがHTTPのみでHTTPSが未設定（S04で検出）
# 3. シークレットがSecretsManagerではなく環境変数に設定される可能性（S05で検出）
# 4. タスクログ保持期間が短い（S04で検出）
# 5. ALB削除保護が無効化される可能性（S04で検出）
#
# 本番環境では絶対に使用しないでください
# ============================================================

# ECSクラスター
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-taskflow-cluster"

  setting {
    name  = "containerInsights"
    value = var.enable_container_insights ? "enabled" : "disabled"
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${var.environment}-taskflow-cluster"
    }
  )
}

# ECSクラスター容量プロバイダー
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.environment}-taskflow-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.enable_alb_deletion_protection
  enable_http2               = true
  enable_cross_zone_load_balancing = true

  tags = merge(
    var.common_tags,
    {
      Name = "${var.environment}-taskflow-alb"
    }
  )
}

# ALBターゲットグループ - バックエンド
resource "aws_lb_target_group" "backend" {
  name        = "${var.environment}-taskflow-backend-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }

  deregistration_delay = 30

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.environment}-taskflow-backend-tg"
      Component = "backend"
    }
  )
}

# ALBターゲットグループ - フロントエンド
resource "aws_lb_target_group" "frontend" {
  name        = "${var.environment}-taskflow-frontend-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }

  deregistration_delay = 30

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.environment}-taskflow-frontend-tg"
      Component = "frontend"
    }
  )
}

# ALBリスナー - HTTP
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# ALBリスナールール - バックエンドAPI
resource "aws_lb_listener_rule" "backend_api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# CloudWatch ロググループ - バックエンド
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.environment}/taskflow-backend"
  retention_in_days = var.log_retention_days

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.environment}-taskflow-backend-logs"
      Component = "backend"
    }
  )
}

# CloudWatch ロググループ - フロントエンド
resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${var.environment}/taskflow-frontend"
  retention_in_days = var.log_retention_days

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.environment}-taskflow-frontend-logs"
      Component = "frontend"
    }
  )
}

# IAMロール - ECSタスク実行ロール
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.environment}-taskflow-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.common_tags,
    {
      Name = "${var.environment}-taskflow-ecs-task-execution-role"
    }
  )
}

# IAMポリシーアタッチメント - ECSタスク実行ロール
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAMロール - ECSタスクロール
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.environment}-taskflow-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.common_tags,
    {
      Name = "${var.environment}-taskflow-ecs-task-role"
    }
  )
}

# ECSタスク定義 - バックエンド
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.environment}-taskflow-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${var.backend_image}:${var.backend_image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "DATABASE_HOST"
          value = var.database_host
        },
        {
          name  = "DATABASE_PORT"
          value = tostring(var.database_port)
        },
        {
          name  = "DATABASE_NAME"
          value = var.database_name
        }
      ]

      secrets = [
        {
          name      = "DATABASE_PASSWORD"
          valueFrom = var.database_password_secret_arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command = [
          "CMD-SHELL",
          "curl -f http://localhost:3000/health || exit 1"
        ]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.environment}-taskflow-backend"
      Component = "backend"
    }
  )
}

# ECSタスク定義 - フロントエンド
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.environment}-taskflow-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.frontend_cpu
  memory                   = var.frontend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "${var.frontend_image}:${var.frontend_image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "NEXT_PUBLIC_API_URL"
          value = "http://${aws_lb.main.dns_name}/api"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command = [
          "CMD-SHELL",
          "curl -f http://localhost:3000/ || exit 1"
        ]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.environment}-taskflow-frontend"
      Component = "frontend"
    }
  )
}

# ECSサービス - バックエンド
resource "aws_ecs_service" "backend" {
  name            = "${var.environment}-taskflow-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.backend_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.http]

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.environment}-taskflow-backend-service"
      Component = "backend"
    }
  )
}

# ECSサービス - フロントエンド
resource "aws_ecs_service" "frontend" {
  name            = "${var.environment}-taskflow-frontend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = var.frontend_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.http]

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.environment}-taskflow-frontend-service"
      Component = "frontend"
    }
  )
}
