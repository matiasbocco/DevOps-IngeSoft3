terraform {
  required_version = ">= 1.5"

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 4.0" # el .terraform.lock.hcl fija la versión exacta y su hash
    }
  }

  # El estado vive FUERA del repo; el path se pasa en el init:
  #   terraform init -backend-config="path=$HOME/tfstate/inventario-preprod.tfstate"
  backend "local" {}
}

# Habla con el Docker de Torvalds por SSH, usando el alias de ~/.ssh/config
# (con el salto por c.fulgor.me). Las credenciales son la llave SSH: nada en el código.
provider "docker" {
  host = var.docker_host
}
