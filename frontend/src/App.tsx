import { useEffect, useMemo, useState } from 'react';
import { checkoutErrorMessage } from './checkout-error';

type Product = {
  id: number;
  name: string;
  subtitle: string;
  price: number;
  category: 'Mesa' | 'Som' | 'Imagem';
  stock: number;
  color: string;
  tag?: string;
};

type CartLine = {
  product: Product;
  quantity: number;
};

type CheckoutResponse = {
  pedidoId?: number;
  status?: string;
  total?: number;
  pagamentoSolicitado?: string;
  erro?: string;
};

type TrackedOrder = {
  pedidoId: number;
  clienteId: string;
};

type OrderStatusResponse = {
  status: string;
};

type OrderNotification = {
  id: number;
  pedidoId: number;
  canal: string;
  mensagem: string;
  enviadoEm: string;
};

class CheckoutRequestError extends Error {
  readonly status: number;

  constructor(status: number, message?: string) {
    super(message);
    this.status = status;
  }
}

const products: Product[] = [
  {
    id: 1,
    name: 'Teclado',
    subtitle: 'Teclas macias, ideias soltas.',
    price: 99.95,
    category: 'Mesa',
    stock: 100,
    color: 'lavender',
    tag: 'queridinho',
  },
  {
    id: 2,
    name: 'Mouse',
    subtitle: 'Pequeno gesto, grande movimento.',
    price: 49.9,
    category: 'Mesa',
    stock: 100,
    color: 'peach',
    tag: 'essencial',
  },
  {
    id: 3,
    name: 'Monitor',
    subtitle: 'Mais espaço para enxergar longe.',
    price: 899.9,
    category: 'Imagem',
    stock: 20,
    color: 'blue',
  },
  {
    id: 4,
    name: 'Headset',
    subtitle: 'Um cantinho só seu, onde estiver.',
    price: 149.9,
    category: 'Som',
    stock: 50,
    color: 'green',
    tag: 'som bom',
  },
  {
    id: 5,
    name: 'Webcam',
    subtitle: 'Presença boa até nos dias remotos.',
    price: 199.9,
    category: 'Imagem',
    stock: 30,
    color: 'yellow',
  },
];

const categories = ['Tudo', 'Mesa', 'Som', 'Imagem'] as const;
type Category = (typeof categories)[number];

type PaymentMethod = 'cartao' | 'pix' | 'boleto';

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cartao: 'Cartão de crédito',
  pix: 'Pix',
  boleto: 'Boleto',
};

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    value
  );

function ProductArt({ id }: { id: number }) {
  if (id === 1) {
    return (
      <svg viewBox="0 0 220 150" role="img" aria-label="Ilustração de teclado">
        <g transform="rotate(-7 110 75)">
          <rect x="34" y="34" width="152" height="82" rx="14" fill="#454b68" />
          <rect x="42" y="42" width="136" height="66" rx="9" fill="#faf8f3" />
          {[0, 1, 2, 3].map((row) =>
            [0, 1, 2, 3, 4, 5, 6, 7].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={49 + col * 15.5}
                y={49 + row * 13}
                width="11"
                height="8"
                rx="2.5"
                fill={row === 0 && col === 2 ? '#f49a79' : '#dad9d1'}
              />
            ))
          )}
          <rect x="76" y="102" width="68" height="3" rx="1.5" fill="#c6c5bd" />
        </g>
        <circle cx="181" cy="27" r="8" fill="#f3a185" />
      </svg>
    );
  }
  if (id === 2) {
    return (
      <svg viewBox="0 0 220 150" role="img" aria-label="Ilustração de mouse">
        <ellipse cx="112" cy="118" rx="45" ry="8" fill="#e1cfc3" />
        <path
          d="M111 25c-24 0-40 18-40 45v13c0 25 16 39 40 39s40-14 40-39V70c0-27-16-45-40-45Z"
          fill="#fffaf4"
          stroke="#625968"
          strokeWidth="3"
        />
        <path d="M111 27v33m0 0c-15 0-29 5-39 14" fill="none" stroke="#625968" strokeWidth="3" />
        <path d="M111 61c15 0 29 5 39 14" fill="none" stroke="#625968" strokeWidth="2" opacity=".35" />
        <rect x="107" y="40" width="8" height="13" rx="4" fill="#ed967a" />
        <circle cx="47" cy="46" r="6" fill="#efaa8d" />
        <path d="m171 49 7 11 13-1-8 9 2 12-11-6-11 6 3-12-9-9 13 1Z" fill="#8489a7" />
      </svg>
    );
  }
  if (id === 3) {
    return (
      <svg viewBox="0 0 220 150" role="img" aria-label="Ilustração de monitor">
        <rect x="40" y="27" width="140" height="82" rx="10" fill="#42485f" />
        <rect x="47" y="34" width="126" height="68" rx="5" fill="#dce8df" />
        <circle cx="144" cy="56" r="18" fill="#f5c77e" />
        <path d="M49 85c21-24 35-20 52-5s31 13 72-20v42H49Z" fill="#829a83" />
        <path d="M99 109h22v12H99z" fill="#555b70" />
        <path d="M83 123h54v5H83z" rx="2" fill="#555b70" />
        <path d="M56 42h24" stroke="white" strokeWidth="3" strokeLinecap="round" opacity=".8" />
      </svg>
    );
  }
  if (id === 4) {
    return (
      <svg viewBox="0 0 220 150" role="img" aria-label="Ilustração de headset">
        <path d="M55 86V70a55 55 0 0 1 110 0v16" fill="none" stroke="#42485f" strokeWidth="15" strokeLinecap="round" />
        <rect x="44" y="74" width="34" height="48" rx="15" fill="#f7f3eb" stroke="#42485f" strokeWidth="4" />
        <rect x="142" y="74" width="34" height="48" rx="15" fill="#f7f3eb" stroke="#42485f" strokeWidth="4" />
        <path d="M160 112c-4 14-17 20-31 16" fill="none" stroke="#ed967a" strokeWidth="4" strokeLinecap="round" />
        <circle cx="122" cy="128" r="5" fill="#ed967a" />
        <path d="m40 39 5 8 9 1-7 6 2 9-9-4-7 4 1-9-6-6 9-1Z" fill="#f0be74" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 220 150" role="img" aria-label="Ilustração de webcam">
      <rect x="62" y="43" width="96" height="60" rx="24" fill="#454b68" />
      <rect x="70" y="50" width="80" height="46" rx="19" fill="#f7f3eb" />
      <circle cx="110" cy="73" r="17" fill="#a9c2b0" />
      <circle cx="110" cy="73" r="10" fill="#41465b" />
      <circle cx="113" cy="70" r="3" fill="#fff" opacity=".8" />
      <path d="M97 103v13l-12 8h50l-12-8v-13" fill="#626982" />
      <path d="M76 41c3-16 13-25 34-25" fill="none" stroke="#ed967a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="54" cy="104" r="5" fill="#f0be74" />
    </svg>
  );
}

function Icon({
  name,
  size = 20,
}: {
  name: 'bag' | 'search' | 'plus' | 'minus' | 'close' | 'arrow' | 'spark';
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };
  if (name === 'bag') return <svg {...common}><path d="M5 8h14l1 12H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>;
  if (name === 'search') return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></svg>;
  if (name === 'plus') return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
  if (name === 'minus') return <svg {...common}><path d="M5 12h14" /></svg>;
  if (name === 'close') return <svg {...common}><path d="m18 6-12 12M6 6l12 12" /></svg>;
  if (name === 'arrow') return <svg {...common}><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
  return <svg {...common}><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></svg>;
}

function App() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('Tudo');
  const [query, setQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [simulateDecline, setSimulateDecline] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('cartao');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResponse | null>(
    null
  );
  const [checkoutError, setCheckoutError] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrder | null>(null);
  const [trackedOrderStatus, setTrackedOrderStatus] = useState('');
  const [trackingMessage, setTrackingMessage] = useState('');
  const [orderNotification, setOrderNotification] =
    useState<OrderNotification | null>(null);
  const [notificationVisible, setNotificationVisible] = useState(false);

  useEffect(() => {
    if (!checkoutError) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCheckoutError('');
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [checkoutError]);

  useEffect(() => {
    if (!trackedOrder) return;
    let stopped = false;
    let timer: number;
    let attempts = 0;
    const maxAttempts = 30;

    const pollOrderAndNotifications = async () => {
      if (stopped) return;
      attempts++;
      let requestFailed = false;

      try {
        const orderQuery = new URLSearchParams({
          clienteId: trackedOrder.clienteId,
        });
        const orderResponse = await fetch(
          `/api/pedidos/${trackedOrder.pedidoId}?${orderQuery}`
        );
        if (orderResponse.ok) {
          const order = (await orderResponse.json()) as OrderStatusResponse;
          setTrackedOrderStatus(order.status);
        } else {
          requestFailed = true;
        }

        const notificationQuery = new URLSearchParams({
          pedidoId: String(trackedOrder.pedidoId),
          clienteId: trackedOrder.clienteId,
        });
        const notificationResponse = await fetch(
          `/api/notificacoes?${notificationQuery}`
        );
        if (notificationResponse.ok) {
          const body = (await notificationResponse.json()) as {
            notificacoes?: OrderNotification[];
          };
          const notification = body.notificacoes?.[0];
          if (notification) {
            setOrderNotification(notification);
            setNotificationVisible(true);
            setTrackingMessage('');
            setTrackedOrder(null);
            return;
          }
        } else {
          requestFailed = true;
        }
      } catch {
        requestFailed = true;
      }

      if (stopped) return;
      if (attempts >= maxAttempts) {
        setTrackingMessage(
          requestFailed
            ? 'Não conseguimos consultar a atualização agora. Você ainda pode acompanhar este pedido mais tarde.'
            : 'O pedido foi criado, mas a notificação ainda não chegou. A confirmação pode levar alguns instantes.'
        );
        setTrackedOrder(null);
        return;
      }

      timer = window.setTimeout(pollOrderAndNotifications, 2000);
    };

    timer = window.setTimeout(pollOrderAndNotifications, 1200);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [trackedOrder]);

  const visibleProducts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === 'Tudo' || product.category === activeCategory;
      const matchesQuery =
        !term ||
        `${product.name} ${product.subtitle}`
          .toLocaleLowerCase('pt-BR')
          .includes(term);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const total = cart.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0
  );

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: Math.min(product.stock, line.quantity + 1) }
            : line
        );
      }
      return [...current, { product, quantity: 1 }];
    });
    setCheckoutError('');
    setCheckoutResult(null);
    setTrackingMessage('');
  }

  function changeQuantity(productId: number, amount: number) {
    setCart((current) =>
      current
        .map((line) =>
          line.product.id === productId
            ? {
                ...line,
                quantity: Math.min(line.product.stock, line.quantity + amount),
              }
            : line
        )
        .filter((line) => line.quantity > 0)
    );
    setCheckoutError('');
    setCheckoutResult(null);
    setTrackingMessage('');
  }

  async function checkout() {
    if (!cart.length || isCheckingOut) return;
    setIsCheckingOut(true);
    setCheckoutError('');
    setCheckoutResult(null);
    const clienteId =
      customerName.trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, '-') ||
      'cliente-demo';
    const itens = cart.map(({ product, quantity }) => ({
      produtoId: product.id,
      quantidade: quantity,
    }));

    try {
      if (demoMode) {
        await new Promise((resolve) => window.setTimeout(resolve, 650));
        const approved = !simulateDecline;
        setCheckoutResult({
          pedidoId: Math.floor(100 + Math.random() * 900),
          status: 'Aguardando pagamento',
          total,
          pagamentoSolicitado: approved ? 'aprovado' : 'recusado',
        });
      } else {
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ clienteId, itens, simularRecusa: simulateDecline }),
        });
        const body = (await response.json()) as CheckoutResponse;
        if (!response.ok) {
          throw new CheckoutRequestError(response.status, body.erro);
        }
        setCheckoutResult(body);
        if (body.pedidoId) {
          setTrackedOrder({ pedidoId: body.pedidoId, clienteId });
          setTrackedOrderStatus(body.status || 'Aguardando pagamento');
          setTrackingMessage('Acompanhando atualizações do pedido…');
        }
      }
      setCart([]);
    } catch (error) {
      const requestError =
        error instanceof CheckoutRequestError ? error : undefined;
      setCheckoutError(
        checkoutErrorMessage(
          requestError?.status ?? (error instanceof TypeError ? undefined : 500),
          requestError?.message
        )
      );
    } finally {
      setIsCheckingOut(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="announcement">
        <Icon name="spark" size={15} />
        <span>Pequenos objetos. Grandes ideias.</span>
        <span className="announcement-separator">✳</span>
        <span className="announcement-note">uma loja de demonstração</span>
      </div>

      <header className="site-header">
        <a className="wordmark" href="#inicio" aria-label="miolo, início">
          E-Story<span>.</span>
        </a>
        <nav className="main-nav" aria-label="Navegação principal">
          <a href="#colecao">A coleção</a>
          <a href="#sobre">Nossa ideia</a>
        </nav>
        <a className="header-cart" href="#sacola" aria-label={`Sacola com ${itemCount} itens`}>
          <Icon name="bag" size={19} />
          <span>Sacola</span>
          <span className="cart-count">{itemCount}</span>
        </a>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> objetos para o seu espaço</p>
            <h1>Seu espaço,<br />do seu <em>jeito.</em></h1>
            <p className="hero-description">
              Uma seleção pequena, pensada para acompanhar as ideias que moram
              na sua mesa.
            </p>
            <a className="text-link" href="#colecao">
              vem ver de perto <Icon name="arrow" size={17} />
            </a>
            <div className="hero-note">
              <span className="note-star">✳</span>
              <span>feito para quem gosta<br />de um bom detalhe</span>
            </div>
          </div>
          <div className="hero-art" aria-label="Ilustração de uma mesa de trabalho">
            <div className="sun-shape" />
            <span className="hero-art-label">um lugar<br />pra criar</span>
            <div className="hero-monitor">
              <div className="monitor-screen">
                <div className="screen-sun" />
                <div className="screen-hill hill-back" />
                <div className="screen-hill hill-front" />
                <span className="screen-spark">✳</span>
              </div>
              <div className="monitor-neck" />
              <div className="monitor-foot" />
            </div>
            <div className="hero-keyboard"><span /><span /><span /><span /><span /><span /><span /><span /><i /></div>
            <div className="hero-cup"><div /></div>
            <div className="hero-plant"><i /><i /><i /><b /></div>
            <div className="hero-desk" />
            <div className="hero-postit">respira<br />e vai :)</div>
          </div>
        </section>

        <section className="benefit-strip" aria-label="Sobre a coleção">
          <span>✳ seleção sem pressa</span><i />
          <span>✳ ideias que cabem na mesa</span><i />
          <span>✳ feito para o dia a dia</span>
        </section>

        <section className="shop-layout" id="colecao">
          <div className="catalog">
            <div className="section-heading">
              <div>
                <p className="eyebrow">01 — escolha com calma</p>
                <h2>Peças que fazem <em>sentido.</em></h2>
              </div>
              <span className="product-total">05 objetos <span>↘</span></span>
            </div>

            <div className="catalog-tools">
              <div className="category-list" aria-label="Filtrar por categoria">
                {categories.map((category) => (
                  <button
                    className={`category-button ${activeCategory === category ? 'active' : ''}`}
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    type="button"
                  >
                    {category}
                  </button>
                ))}
              </div>
              <label className="search-box">
                <Icon name="search" size={17} />
                <input
                  aria-label="Buscar objetos"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="o que você procura?"
                  value={query}
                />
              </label>
            </div>

            <div className="product-grid">
              {visibleProducts.map((product, index) => {
                const inCart =
                  cart.find((line) => line.product.id === product.id)?.quantity ??
                  0;
                return (
                  <article className="product-card" key={product.id}>
                    <div className={`product-art ${product.color}`}>
                      {product.tag && <span className="product-tag">{product.tag}</span>}
                      <span className="product-index">0{index + 1}</span>
                      <ProductArt id={product.id} />
                      <button
                        aria-label={`Adicionar ${product.name} à sacola`}
                        className={`quick-add ${inCart ? 'in-cart' : ''}`}
                        disabled={inCart >= product.stock}
                        onClick={() => addToCart(product)}
                        type="button"
                      >
                        {inCart ? <span>{inCart} na sacola</span> : <Icon name="plus" size={19} />}
                      </button>
                    </div>
                    <div className="product-details">
                      <div>
                        <p className="product-category">{product.category}</p>
                        <h3>{product.name}</h3>
                        <p className="product-subtitle">{product.subtitle}</p>
                      </div>
                      <strong>{money(product.price)}</strong>
                    </div>
                  </article>
                );
              })}
              {visibleProducts.length === 0 && (
                <div className="empty-search">
                  <Icon name="search" size={24} />
                  <p>Nenhum objeto por aqui.</p>
                  <span>Tente outro nome ou categoria.</span>
                </div>
              )}
            </div>
            <p className="catalog-footnote">
              * Produtos e disponibilidade são dados de demonstração, alinhados
              ao seed do backend.
            </p>
          </div>

          <aside className="cart-panel" id="sacola">
            <div className="cart-heading">
              <div>
                <p className="eyebrow">02 — seu cantinho</p>
                <h2>A sacola <span>({itemCount})</span></h2>
              </div>
              <span className="cart-flower">✳</span>
            </div>

            {cart.length === 0 && !checkoutResult ? (
              <div className="cart-empty">
                <div className="empty-bag"><Icon name="bag" size={26} /></div>
                <p>Ainda está vazia.</p>
                <span>Escolha uma peça que combine com você.</span>
                <a href="#colecao">explorar a coleção <Icon name="arrow" size={15} /></a>
              </div>
            ) : null}

            {cart.length > 0 && (
              <>
                <div className="cart-items">
                  {cart.map(({ product, quantity }) => (
                    <div className="cart-line" key={product.id}>
                      <div className={`cart-thumb ${product.color}`}><ProductArt id={product.id} /></div>
                      <div className="cart-line-info">
                        <div className="cart-line-title">
                          <strong>{product.name}</strong>
                          <span>{money(product.price * quantity)}</span>
                        </div>
                        <small>{money(product.price)} cada</small>
                        <div className="quantity-control">
                          <button
                            aria-label={`Diminuir quantidade de ${product.name}`}
                            onClick={() => changeQuantity(product.id, -1)}
                            type="button"
                          ><Icon name="minus" size={13} /></button>
                          <span>{quantity}</span>
                          <button
                            aria-label={`Aumentar quantidade de ${product.name}`}
                            disabled={quantity >= product.stock}
                            onClick={() => changeQuantity(product.id, 1)}
                            type="button"
                          ><Icon name="plus" size={13} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <label className="customer-field">
                  <span>Um nome para o pedido <small>(opcional)</small></span>
                  <input
                    autoComplete="name"
                    maxLength={80}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="ex.: Marina"
                    value={customerName}
                  />
                </label>

                <label className="payment-method-field">
                  <span>Forma de pagamento <small>(demonstração)</small></span>
                  <select
                    aria-label="Forma de pagamento (demonstração)"
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      if (
                        value === 'cartao' ||
                        value === 'pix' ||
                        value === 'boleto'
                      )
                        setPaymentMethod(value);
                    }}
                    value={paymentMethod}
                  >
                    <option value="cartao">Cartão de crédito</option>
                    <option value="pix">Pix</option>
                    <option value="boleto">Boleto</option>
                  </select>
                  <small className="payment-method-note">
                    A forma escolhida é apenas visual; o backend atual simula
                    aprovação ou recusa.
                  </small>
                </label>

                <div className="checkout-options">
                  <label className="toggle-row">
                    <input
                      checked={demoMode}
                      onChange={(event) => setDemoMode(event.target.checked)}
                      type="checkbox"
                    />
                    <span className="toggle" />
                    <span>
                      <strong>Modo apresentação</strong>
                      <small>Simula o checkout sem o backend</small>
                    </span>
                  </label>
                  <label className="decline-option">
                    <input
                      checked={simulateDecline}
                      onChange={(event) => setSimulateDecline(event.target.checked)}
                      type="checkbox"
                    />
                    <span>Simular pagamento recusado</span>
                  </label>
                </div>

                <div className="cart-total">
                  <span>Total da seleção</span>
                  <strong>{money(total)}</strong>
                </div>
                <button
                  className="checkout-button"
                  disabled={isCheckingOut}
                  onClick={checkout}
                  type="button"
                >
                  {isCheckingOut
                    ? 'preparando seu pedido...'
                    : demoMode
                      ? 'simular pedido'
                      : 'finalizar pedido'}
                  {!isCheckingOut && <Icon name="arrow" size={17} />}
                </button>
                <p className="checkout-caption">
                  {demoMode
                    ? 'Nenhuma chamada é feita ao backend.'
                    : 'Checkout real pelo Gateway · POST /checkout'}
                </p>
              </>
            )}

            {checkoutResult && (
              <div className="order-result" role="status">
                <span className="result-icon"><Icon name="spark" size={22} /></span>
                <p className="eyebrow">
                  {demoMode ? 'simulação concluída' : 'checkout concluído'}
                </p>
                <h3>Pedido recebido!</h3>
                {checkoutResult.pedidoId && (
                  <p className="order-number">
                    pedido <strong>#{checkoutResult.pedidoId}</strong>
                  </p>
                )}
                <div className="result-row">
                  <span>Pagamento</span>
                  <strong className={checkoutResult.pagamentoSolicitado === 'recusado' ? 'declined' : 'approved'}>
                    {checkoutResult.pagamentoSolicitado === 'recusado' ? 'recusado' : 'aprovado'}
                  </strong>
                </div>
                <div className="result-row">
                  <span>Forma selecionada (simulação)</span>
                  <strong>{paymentMethodLabels[paymentMethod]}</strong>
                </div>
                <div className="result-row">
                  <span>Estado do pedido</span>
                  <strong>{trackedOrderStatus || checkoutResult.status || 'Aguardando pagamento'}</strong>
                </div>
                {checkoutResult.total !== undefined && (
                  <div className="result-row">
                    <span>Total</span><strong>{money(checkoutResult.total)}</strong>
                  </div>
                )}
                <p className="async-note">
                  {demoMode
                    ? 'Na simulação, a atualização assíncrona e a notificação não são enviadas.'
                    : trackingMessage ||
                      (orderNotification
                        ? 'O pedido e sua notificação foram atualizados pelo Gateway.'
                        : 'O Gateway responde agora; estamos consultando o status e as notificações do pedido.')}
                </p>
                <button
                  className="new-order"
                  onClick={() => {
                    setCheckoutResult(null);
                    setSimulateDecline(false);
                  }}
                  type="button"
                >
                  voltar à coleção <Icon name="arrow" size={16} />
                </button>
              </div>
            )}
          </aside>
        </section>

        <section className="story-band" id="sobre">
          <span className="story-mark">m.</span>
          <p>Menos excesso.<br /><em>Mais presença.</em></p>
          <span className="story-caption">Uma coleção pequena para deixar<br />o cotidiano um pouco mais bonito.</span>
          <span className="story-flower">✳</span>
        </section>
      </main>

      {checkoutError && (
        <div
          className="error-popup-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCheckoutError('');
          }}
        >
          <section
            aria-describedby="checkout-error-description"
            aria-labelledby="checkout-error-title"
            aria-modal="true"
            className="error-popup"
            role="alertdialog"
          >
            <button
              aria-label="Fechar aviso"
              className="error-popup-close"
              onClick={() => setCheckoutError('')}
              type="button"
            >
              <Icon name="close" size={18} />
            </button>
            <span className="error-popup-icon">!</span>
            <p className="eyebrow">um instante, por favor</p>
            <h2 id="checkout-error-title">Não foi possível concluir</h2>
            <p id="checkout-error-description">{checkoutError}</p>
            <div className="error-popup-actions">
              <button
                className="error-popup-secondary"
                onClick={() => setCheckoutError('')}
                type="button"
              >
                revisar sacola
              </button>
              <button
                className="error-popup-primary"
                onClick={() => {
                  setCheckoutError('');
                  void checkout();
                }}
                type="button"
              >
                tentar novamente <Icon name="arrow" size={16} />
              </button>
            </div>
          </section>
        </div>
      )}

      {notificationVisible && orderNotification && (
        <aside
          aria-live="polite"
          className="order-notification"
          role="status"
        >
          <button
            aria-label="Fechar notificação"
            className="notification-close"
            onClick={() => setNotificationVisible(false)}
            type="button"
          >
            <Icon name="close" size={16} />
          </button>
          <span className="notification-mark"><Icon name="spark" size={18} /></span>
          <div>
            <p className="eyebrow">novidade do pedido #{orderNotification.pedidoId}</p>
            <strong>{orderNotification.mensagem}</strong>
            <small>
              {new Intl.DateTimeFormat('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
              }).format(new Date(orderNotification.enviadoEm))}
              {' · '}canal {orderNotification.canal}
            </small>
          </div>
        </aside>
      )}

      <footer className="site-footer">
        <a className="wordmark footer-wordmark" href="#inicio">E-Story<span>.</span></a>
        <span>Um projeto de loja virtual em modo demonstração.</span>
        <a href="#inicio">voltar ao topo ↑</a>
      </footer>
    </div>
  );
}

export default App;
