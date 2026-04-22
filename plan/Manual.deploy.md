
  1. Disable both CI/CD workflows (prevents deploy on push):
  gh workflow disable "Backend CI/CD" --repo Robert-Freire/langTeachSaaS
  gh workflow disable "Frontend CI/CD" --repo Robert-Freire/langTeachSaaS
  2. Merge manually and push main:
  git checkout main && git pull origin main && git merge origin/sprint/ui-redesign-student-polish --no-ff -m "chore: merge
  sprint/ui-redesign-student-polish into main" && git push origin main
  3. When ready to deploy, re-enable and trigger:
  gh workflow enable "Backend CI/CD" --repo Robert-Freire/langTeachSaaS
  gh workflow enable "Frontend CI/CD" --repo Robert-Freire/langTeachSaaS
  gh workflow run backend.yml --ref main --repo Robert-Freire/langTeachSaaS
  gh workflow run frontend.yml --ref main --repo Robert-Freire/langTeachSaaS
