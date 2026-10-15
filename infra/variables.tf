variable "docker_host" {
  description = "Docker donde vive preprod (alias SSH de ~/.ssh/config)"
  type        = string
  default     = "ssh://fulgor-srv"
}

variable "db_password" {
  description = "Password de la base de preprod"
  type        = string
  sensitive   = true # no se imprime en el plan ni en los logs
}

variable "image_tag" {
  description = "Imagen del TP7 a desplegar: sha-<commit> de un merge publicado"
  type        = string # sin default: el pipeline no publica otra etiqueta
}

variable "api_port" {
  description = "Puerto del host para la api (QA usa 8080, PROD 8081)"
  type        = number
  default     = 8090
}

variable "front_port" {
  description = "Puerto del host para el front (QA usa 3000, PROD 3001)"
  type        = number
  default     = 3002
}
