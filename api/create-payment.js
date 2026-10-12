export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Método não permitido.' });

  const gatewayUrl = process.env.DUTTYFY_PIX_URL_ENCRYPTED;
  if (!gatewayUrl || !gatewayUrl.startsWith('https://')) {
    return res.status(500).json({ success: false, message: 'Pagamento não configurado no servidor.' });
  }

  const input = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return null; } })() : req.body;
  if (!input || typeof input !== 'object') return res.status(400).json({ success: false, message: 'Requisição inválida.' });

  const digits = value => String(value || '').replace(/\D/g, '');
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim();
  const phone = digits(input.phone);
  const document = digits(input.document);
  if (name.length < 3) return res.status(400).json({ success: false, message: 'Digite um nome válido.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Digite um e-mail válido.' });
  if (![10, 11].includes(phone.length)) return res.status(400).json({ success: false, message: 'Digite um telefone válido com DDD.' });
  if (![11, 14].includes(document.length)) return res.status(400).json({ success: false, message: 'Digite um CPF ou CNPJ válido.' });

  const defaultAmount = Number.parseInt(process.env.AMOUNT_CENTS || '9700', 10);
  const requestedAmount = Number.parseInt(input.amount, 10);
  const amount = Number.isFinite(requestedAmount) && requestedAmount >= 100 ? requestedAmount : defaultAmount;
  const product = String(input.product || process.env.PRODUCT_NAME || 'Pedido').trim().slice(0, 200);
  if (!Number.isInteger(amount) || amount < 100) return res.status(500).json({ success: false, message: 'Valor do pedido inválido.' });

  let utm = String(input.utm || '').replace(/[\x00-\x20\x7F]/g, '').replace(/^\?/, '').slice(0, 4000);
  const payload = {
    amount,
    description: product,
    customer: { name, document, email, phone },
    item: { title: product, price: amount, quantity: 1 },
    paymentMethod: 'PIX',
    utm
  };

  try {
    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000)
    });
    const data = await response.json().catch(() => null);
    if (response.status === 401) return res.status(502).json({ success: false, message: 'Pagamento indisponível. Verifique a credencial do gateway.' });
    if (!response.ok || !data?.pixCode || !data?.transactionId) {
      return res.status(response.status >= 400 && response.status < 500 ? 400 : 502)
        .json({ success: false, message: data?.message || data?.error || 'O gateway não conseguiu criar o PIX.' });
    }
    return res.status(200).json({
      success: true,
      transactionId: String(data.transactionId),
      pixCode: String(data.pixCode),
      status: data.status || 'PENDING'
    });
  } catch (error) {
    console.error('Falha ao criar PIX:', error?.name || 'gateway_error');
    return res.status(502).json({ success: false, message: 'Não foi possível conectar ao gateway. Tente novamente.' });
  }
}
