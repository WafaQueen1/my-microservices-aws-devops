# Main Terraform configuration for AWS K3s E-Commerce Application
# Provider and backend configuration

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# AWS Provider Configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ecommerce-microservices"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Data source to get available AZs
data "aws_availability_zones" "available" {
  state = "available"
}

# Data source to get current AWS account ID
data "aws_caller_identity" "current" {}
