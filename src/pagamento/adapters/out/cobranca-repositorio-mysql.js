const Cobranca = require('../../application/ports').CobrancaRepositorio;

// Adaptador de saida: persistencia em MySQL.
class CobrancaRepositorioMysql extends Cobranca {
  constructor({ pool }) {
    super();
    this.pool = pool;
  }

  async inserir(cobranca) {
    const [resultado] = await this.pool.execute(
      'INSERT INTO cobrancas (pedido_id, valor, status) VALUES (?, ?, ?)',
      [cobranca.pedidoId, cobranca.valor, cobranca.status]
    );
    return resultado.insertId;
  }

  async atualizarStatus(id, status) {
    await this.pool.execute('UPDATE cobrancas SET status = ? WHERE id = ?', [status, id]);
  }
}

module.exports = CobrancaRepositorioMysql;
