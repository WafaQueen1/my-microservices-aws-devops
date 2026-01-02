# CloudWatch Dashboard for monitoring EC2 and RDS
# creates a dashboard to visualize built-in AWS metrics

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      # Title
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# E-Commerce K3s Cluster - CloudWatch Dashboard"
        }
      },
      # EC2 CPU Utilization
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "EC2 CPU Utilization"
          region = var.aws_region
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", aws_instance.k3s_master.id, { label = "Master" }],
            ["AWS/EC2", "CPUUtilization", "InstanceId", aws_instance.k3s_worker[0].id, { label = "Worker 1" }],
            ["AWS/EC2", "CPUUtilization", "InstanceId", aws_instance.k3s_worker[1].id, { label = "Worker 2" }]
          ]
          period = 300
          stat   = "Average"
          view   = "timeSeries"
        }
      },
      # EC2 Network In
      {
        type   = "metric"
        x      = 8
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "EC2 Network In (bytes)"
          region = var.aws_region
          metrics = [
            ["AWS/EC2", "NetworkIn", "InstanceId", aws_instance.k3s_master.id, { label = "Master" }],
            ["AWS/EC2", "NetworkIn", "InstanceId", aws_instance.k3s_worker[0].id, { label = "Worker 1" }],
            ["AWS/EC2", "NetworkIn", "InstanceId", aws_instance.k3s_worker[1].id, { label = "Worker 2" }]
          ]
          period = 300
          stat   = "Sum"
          view   = "timeSeries"
        }
      },
      # EC2 Network Out
      {
        type   = "metric"
        x      = 16
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "EC2 Network Out (bytes)"
          region = var.aws_region
          metrics = [
            ["AWS/EC2", "NetworkOut", "InstanceId", aws_instance.k3s_master.id, { label = "Master" }],
            ["AWS/EC2", "NetworkOut", "InstanceId", aws_instance.k3s_worker[0].id, { label = "Worker 1" }],
            ["AWS/EC2", "NetworkOut", "InstanceId", aws_instance.k3s_worker[1].id, { label = "Worker 2" }]
          ]
          period = 300
          stat   = "Sum"
          view   = "timeSeries"
        }
      },
      # RDS CPU
      {
        type   = "metric"
        x      = 0
        y      = 7
        width  = 8
        height = 6
        properties = {
          title  = "RDS CPU Utilization"
          region = var.aws_region
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main.identifier]
          ]
          period = 300
          stat   = "Average"
          view   = "timeSeries"
        }
      },
      # RDS Connections
      {
        type   = "metric"
        x      = 8
        y      = 7
        width  = 8
        height = 6
        properties = {
          title  = "RDS Database Connections"
          region = var.aws_region
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", aws_db_instance.main.identifier]
          ]
          period = 300
          stat   = "Average"
          view   = "timeSeries"
        }
      },
      # RDS Free Storage
      {
        type   = "metric"
        x      = 16
        y      = 7
        width  = 8
        height = 6
        properties = {
          title  = "RDS Free Storage (bytes)"
          region = var.aws_region
          metrics = [
            ["AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", aws_db_instance.main.identifier]
          ]
          period = 300
          stat   = "Average"
          view   = "timeSeries"
        }
      },
      # RDS Read/Write IOPS
      {
        type   = "metric"
        x      = 0
        y      = 13
        width  = 12
        height = 6
        properties = {
          title  = "RDS IOPS"
          region = var.aws_region
          metrics = [
            ["AWS/RDS", "ReadIOPS", "DBInstanceIdentifier", aws_db_instance.main.identifier, { label = "Read" }],
            ["AWS/RDS", "WriteIOPS", "DBInstanceIdentifier", aws_db_instance.main.identifier, { label = "Write" }]
          ]
          period = 300
          stat   = "Average"
          view   = "timeSeries"
        }
      },
      # RDS Latency
      {
        type   = "metric"
        x      = 12
        y      = 13
        width  = 12
        height = 6
        properties = {
          title  = "RDS Latency (seconds)"
          region = var.aws_region
          metrics = [
            ["AWS/RDS", "ReadLatency", "DBInstanceIdentifier", aws_db_instance.main.identifier, { label = "Read" }],
            ["AWS/RDS", "WriteLatency", "DBInstanceIdentifier", aws_db_instance.main.identifier, { label = "Write" }]
          ]
          period = 300
          stat   = "Average"
          view   = "timeSeries"
        }
      }
    ]
  })
}

# Output the dashboard URL
output "cloudwatch_dashboard_url" {
  description = "URL to the CloudWatch dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${var.project_name}-dashboard"
}
