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
