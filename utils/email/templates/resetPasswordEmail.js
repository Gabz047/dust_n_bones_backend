// utils/email/templates/resetPasswordEmail.js

export function resetPasswordEmailTemplate({ name, resetLink }) {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redefinir Senha</title>
    </head>
    <body style="margin: 0; padding: 60px 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f4f4f7;">
      <table role="presentation" style="width: 100%; border-collapse: collapse; padding: 0 20px;">
        <tr>
          <td align="center">
            <!-- Container Principal -->
            <table role="presentation" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 16px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); overflow: hidden; border: 1px solid #e5e7eb;">
              
              <!-- Header com ícone -->
              <tr>
  <td style="padding: 60px 40px 30px; text-align: center; background: #ffffff;">
    <h1 style="margin: 0 0 20px; font-size: 36px; font-weight: 800; color: #111827; letter-spacing: -0.5px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
      <span style="color: #0d6efd;">E</span>stoquelogia
    </h1>
    <p style="margin: 0; font-size: 20px; font-weight: 600; color: #374151;">
      Redefinição de Senha
    </p>
  </td>
</tr>

              <!-- Conteúdo -->
              <tr>
                <td style="padding: 40px 45px 30px; background: #ffffff;">
                  <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                    Olá${
                      name
                        ? `, <strong style="color: #111827;">${name}</strong>`
                        : ""
                    }!
                  </p>
                  
                  <p style="margin: 0 0 25px; font-size: 15px; line-height: 1.6; color: #6b7280;">
                    Recebemos uma solicitação para redefinir a senha da sua conta. Para continuar, clique no botão abaixo:
                  </p>

                  <!-- Botão CTA -->
                  <table role="presentation" style="width: 100%; margin: 35px 0;">
                    <tr>
                      <td align="center">
                        <a href="${resetLink}" 
                           style="display: inline-block; 
                                  background: #0d6efd; 
                                  color: #ffffff; 
                                  padding: 16px 42px; 
                                  text-decoration: none; 
                                  border-radius: 10px; 
                                  font-weight: 600; 
                                  font-size: 16px;
                                  box-shadow: 0 4px 16px rgba(13, 110, 253, 0.3);
                                  transition: all 0.3s ease;">
                          Redefinir Minha Senha
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Info de segurança -->
                  <div style="background: #fef9c3; border-left: 4px solid #facc15; padding: 16px 20px; border-radius: 8px; margin: 25px 0;">
                    <p style="margin: 0 0 8px; font-size: 14px; line-height: 1.5; color: #92400e; font-weight: 600;">
                      ⏱️ Atenção: Link temporário
                    </p>
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #78350f;">
                      Este link é válido por apenas <strong>15 minutos</strong> e pode ser usado uma única vez.
                    </p>
                  </div>

                  <p style="margin: 25px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                    Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada.
                  </p>
                </td>
              </tr>

              <!-- Link alternativo -->
              <tr>
                <td style="padding: 0 45px 35px; background: #ffffff;">
                  <div style="background: #f9fafb; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">
                      Problemas com o botão? Copie e cole este link no seu navegador:
                    </p>
                    <p style="margin: 0; font-size: 12px; word-break: break-all; color: #0d6efd; font-family: 'Courier New', monospace;">
                      ${resetLink}
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 35px 45px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 8px; font-size: 14px; color: #111827; font-weight: 600;">
                    Atenciosamente,
                  </p>
                  <p style="margin: 0 0 20px; font-size: 14px; color: #374151;">
                    Equipe de Suporte
                  </p>
                  
                  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9ca3af; text-align: center;">
                      Este é um email automático, por favor não responda.<br>
                      Se precisar de ajuda, entre em contato com nosso suporte.
                    </p>
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
