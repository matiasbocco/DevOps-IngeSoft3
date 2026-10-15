# Las URLs salen de los puertos que Docker publicó, no se escriben a mano.
output "api_health_url" {
  value = "http://${var.public_host}:${docker_container.api.ports[0].external}/health"
}

output "api_items_url" {
  description = "Endpoint que toca la base"
  value       = "http://${var.public_host}:${docker_container.api.ports[0].external}/api/items"
}

output "front_url" {
  value = "http://${var.public_host}:${docker_container.front.ports[0].external}"
}
