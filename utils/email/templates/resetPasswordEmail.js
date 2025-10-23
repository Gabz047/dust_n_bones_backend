// utils/email/templates/resetPasswordEmail.js

export function resetPasswordEmailTemplate({ name, resetLink }) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Olá${name ? `, ${name}` : ''}!</h2>
      <p>Recebemos uma solicitação para redefinir sua senha.</p>
      <p>Para continuar, clique no botão abaixo:</p>
      <p style="text-align: center;">
        <a href="${resetLink}" 
           style="background: #007bff; color: white; padding: 10px 20px; 
                  text-decoration: none; border-radius: 4px;">
          Redefinir Senha
        </a>
      </p>
      <p>Este link é válido por 15 minutos.</p>
      <p>Se você não fez esta solicitação, ignore este email.</p>
      <br />
      <p>Atenciosamente,</p>
      <p><strong>Equipe de Suporte</strong></p>
    </div>
  `;
}
