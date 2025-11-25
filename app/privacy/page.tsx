import React from 'react';

export default function PrivacyPolicy() {
    return (
        <div style={{
            fontFamily: 'Arial, sans-serif',
            lineHeight: '1.6',
            color: '#333',
            maxWidth: '800px',
            margin: '0 auto',
            padding: '40px 20px',
            backgroundColor: '#fff'
        }}>
            <h1 style={{ fontSize: '32px', marginBottom: '20px', color: '#111' }}>Política de Privacidade</h1>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '40px' }}>Última atualização: 25 de Novembro de 2025</p>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#222' }}>1. Introdução</h2>
                <p>
                    Bem-vindo ao AlugaZap. A sua privacidade é importante para nós. Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas informações quando você visita nosso site ou utiliza nossos serviços.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#222' }}>2. Coleta de Informações</h2>
                <p>
                    Podemos coletar informações pessoais que você nos fornece voluntariamente ao se registrar no site, expressar interesse em obter informações sobre nós ou nossos produtos e serviços, ao participar de atividades no site ou ao entrar em contato conosco.
                </p>
                <p>
                    As informações pessoais que coletamos podem incluir:
                </p>
                <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
                    <li>Nomes;</li>
                    <li>Endereços de e-mail;</li>
                    <li>Números de telefone;</li>
                    <li>Outras informações de contato semelhantes.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#222' }}>3. Uso das Informações</h2>
                <p>
                    Usamos as informações pessoais coletadas através do nosso site para diversos fins comerciais descritos abaixo. Processamos suas informações pessoais para esses fins com base em nossos interesses comerciais legítimos, para celebrar ou executar um contrato com você, com o seu consentimento e/ou para conformidade com nossas obrigações legais.
                </p>
                <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
                    <li>Para facilitar a criação de contas e o processo de login;</li>
                    <li>Para enviar informações administrativas para você;</li>
                    <li>Para atender e gerenciar seus pedidos;</li>
                    <li>Para proteger nossos serviços.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#222' }}>4. Compartilhamento de Informações</h2>
                <p>
                    Podemos processar ou compartilhar seus dados que mantemos com base nas seguintes bases legais:
                </p>
                <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
                    <li>Consentimento: Podemos processar seus dados se você nos der consentimento específico para usar suas informações pessoais para um propósito específico.</li>
                    <li>Interesses Legítimos: Podemos processar seus dados quando for razoavelmente necessário para alcançar nossos interesses comerciais legítimos.</li>
                    <li>Obrigações Legais: Podemos divulgar suas informações onde formos legalmente obrigados a fazê-lo.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#222' }}>5. Segurança das Informações</h2>
                <p>
                    Implementamos medidas de segurança técnicas e organizacionais apropriadas projetadas para proteger a segurança de qualquer informação pessoal que processamos. No entanto, lembre-se de que não podemos garantir que a internet em si seja 100% segura.
                </p>
            </section>

            <section style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#222' }}>6. Exclusão de Dados</h2>
                <p style={{ fontWeight: 'bold' }}>
                    Para solicitar a exclusão dos seus dados, envie um email para <a href="mailto:igor.gewehr1@gmail.com" style={{ color: '#0066cc', textDecoration: 'none' }}>igor.gewehr1@gmail.com</a> e removeremos suas informações em até 48h.
                </p>
            </section>
        </div>
    );
}
