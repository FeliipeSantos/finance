# Portal da plataforma

Abra `/portal` no frontend ou use o link **Portal.Finance** na tela de login. O nome desse link acompanha a identidade configurada na aba **Plataforma**.

- Usuário administrativo único: `admin`.
- Senha padrão: `admin`. A variável de ambiente `PORTAL_ADMIN_PASSWORD` permite configurar outra senha no backend.
- A sessão administrativa dura uma hora e fica separada da sessão comum da aplicação.
- **Plataforma** permite editar o nome, o ícone e o favicon globais. Um nome vazio ou composto apenas por espaços usa **Finance**. Cada imagem pode ser restaurada pelo botão **Usar padrão**; clique em **Salvar alterações** para aplicar. Os uploads aceitam PNG, JPEG, WebP ou ICO de até 10 MB e preservam a proporção da imagem.
- A identidade é armazenada no banco, independentemente das contas dos usuários. O nome aparece no login, no portal, no menu, no título da aba, nos relatórios PDF e nas novas configurações do autenticador. Os rótulos já cadastrados em aplicativos autenticadores externos não são renomeados automaticamente.
- `GET /api/v1/portal/branding` fornece apenas a identidade pública; `PUT /api/v1/portal/branding` exige sessão administrativa. Reinicie o backend após atualizar o código para criar automaticamente a tabela `platform_branding`.
- A lista mostra todos os usuários, com busca por nome/e-mail, data de cadastro e contagem de contas financeiras, cartões e lançamentos.
- **Ícones compartilhados** permite adicionar imagens com prévia e removê-las da biblioteca global. Todos os usuários podem selecioná-las em contas e cartões. Apenas o administrador do Portal gerencia essa biblioteca.
- Imagens enviadas pelo aplicativo comum são privadas, inclusive as de `felipe@test.com` e as do usuário mais antigo.
- Na primeira inicialização após a atualização, os ícones anteriormente compartilhados pela conta mais antiga são transferidos para a biblioteca do Portal. A migração ocorre uma única vez e preserva as imagens já aplicadas aos cadastros.
- **Resetar** apaga os dados financeiros, ícones privados, notificações e preferências, restaura as categorias padrão e mantém o perfil, a senha e o MFA. A biblioteca compartilhada do Portal é preservada.
- **Excluir** remove o usuário e seus dados. O login deixa de funcionar.
- Ambas as ações exigem digitar o e-mail da conta afetada. A limpeza e a restauração são transacionais: uma falha desfaz toda a operação.

O portal usa o mesmo backend definido por `VITE_API_URL`. A rota `/portal` não exige configurar um domínio novo.

Validação do backend:

```powershell
cd backend
.\venv\Scripts\python.exe -m pytest tests/test_branding.py tests/test_portal.py tests/test_shared_icons.py tests/test_auth.py -q
```
