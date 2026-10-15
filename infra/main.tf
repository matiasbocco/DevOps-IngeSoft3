# preprod: un entorno NUEVO que convive con QA y PROD sin tocarlos.
# Todo lleva el prefijo inventario-preprod para no chocar con los proyectos de compose.
locals {
  prefix = "inventario-preprod"
}

resource "docker_network" "app" {
  name = local.prefix
}

resource "docker_volume" "db_data" {
  name = "${local.prefix}-db-data"
}

# keep_locally: el destroy no borra la imagen, porque QA y PROD también usan postgres:16-alpine.
resource "docker_image" "postgres" {
  name         = "postgres:16-alpine"
  keep_locally = true
}

resource "docker_container" "db" {
  name    = "${local.prefix}-db"
  image   = docker_image.postgres.image_id
  restart = "unless-stopped"
  env = [
    "POSTGRES_DB=inventario",
    "POSTGRES_USER=postgres",
    "POSTGRES_PASSWORD=${var.db_password}",
  ]
  networks_advanced {
    name = docker_network.app.name
  }
  volumes {
    volume_name    = docker_volume.db_data.name
    container_path = "/var/lib/postgresql/data"
  }
}

# La api corre LA IMAGEN DEL TP7 (sha-<commit>), no un build.
resource "docker_image" "api" {
  name         = "ghcr.io/matiasbocco/devops-ingesoft3-backend:${var.image_tag}"
  keep_locally = true # puede ser la misma imagen que usa QA o PROD
}

resource "docker_container" "api" {
  name    = "${local.prefix}-api"
  image   = docker_image.api.image_id
  restart = "unless-stopped" # depends_on espera que la base se CREE, no que esté lista: si arranca antes, reintenta
  env = [
    # DERIVADA: el host es el nombre del contenedor de la base, no una dirección copiada.
    "DATABASE_URL=Host=${docker_container.db.name};Database=inventario;Username=postgres;Password=${var.db_password}",
  ]
  networks_advanced {
    name = docker_network.app.name
  }
  ports {
    internal = 8080
    external = var.api_port
  }
  depends_on = [docker_container.db]
}
