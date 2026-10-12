export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Método não permitido.' });

  const id = String(req.query?.transactionId || '');
  if (!/^[A-Za-z0-9_-]{8,120}$/.test(id)) return res.status(400).json({ success: false, message: 'transactionId inválido.' });
  const gatewayUrl = process.env.DUTTYFY_PIX_URL_ENCRYPTED;
  if (!gatewayUrl || !gatewayUrl.startsWith('https://')) return res.status(500).json({ success: false, message: 'Pagamento não configurado no servidor.' });

  try {
    const separator = gatewayUrl.includes('?') ? '&' : '?';
    const response = await fetch(gatewayUrl + separator + 'transactionId=' + encodeURIComponent(id), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
      cache: 'no-store'
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || typeof data.status !== 'string') {
      return res.status(502).json({ success: false, message: 'Não foi possível consultar a transação.' });
    }
    const successUrl = String(process.env.SUCCESS_URL || '').trim();
    return res.status(200).json({
      success: true,
      status: data.status,
      paidAt: data.paidAt || null,
      successUrl: data.status === 'COMPLETED' && successUrl ? successUrl : null
    });
  } catch (error) {
    console.error('Falha ao consultar status PIX:', error?.name || 'gateway_error');
    return res.status(502).json({ success: false, message: 'Não foi possível consultar a transação.' });
  }
}
