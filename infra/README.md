# infra/ — entorno preprod (TP8, plan C)

Terraform con el provider Docker crea `preprod` en Torvalds, al lado de QA y PROD y sin tocarlos:
red, volumen, Postgres, api (`:8090`) y front (`:3002`), todos con prefijo `inventario-preprod`.
Terraform corre en la notebook y habla con el Docker del servidor por SSH (`ssh://fulgor-srv`).

## Una sola vez

```bash
# Notebook (WSL): instalar Terraform
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install -y terraform

# Servidor: que fulgor pueda usar Docker sin sudo (después, salir y volver a entrar)
ssh -t fulgor-srv 'sudo usermod -aG docker fulgor'

# Notebook: variables (local.tfvars está ignorado por git)
cd infra
cp local.tfvars.example local.tfvars   # y completá la password
mkdir -p ~/tfstate
terraform init -backend-config="path=$HOME/tfstate/inventario-preprod.tfstate"
```

## El ciclo (lo que se hace en la defensa)

```bash
terraform plan    -var-file=local.tfvars   # leer qué se crea
terraform apply   -var-file=local.tfvars   # preprod nace
ssh fulgor-srv 'curl -s localhost:8090/health; echo; curl -s localhost:8090/api/items; echo; curl -s localhost:3002/api/items'
terraform destroy -var-file=local.tfvars   # preprod muere (QA y PROD siguen)
```

## Experimentos (no se entregan)

```bash
terraform plan -var-file=local.tfvars                 # segunda pasada: "No changes" (idempotencia)
ssh fulgor-srv 'docker rm -f inventario-preprod-api'  # drift: borrar algo a mano
terraform plan -var-file=local.tfvars                 # lo detecta: "will be created"
terraform apply -var-file=local.tfvars                # y lo repara
```

Para ver `prevent_destroy`, agregá temporalmente en `docker_volume.db_data`:
`lifecycle { prevent_destroy = true }` y corré `terraform destroy`: se niega. Sacalo después.
