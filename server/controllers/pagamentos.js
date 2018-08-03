module.exports = function(app){
  app.get('/pagamentos', function(req, res){
    console.log('Recebida requisicao de teste na porta 3000.')
    res.send('OK.');
  });

  /**
  res.status(400);
  res.format({
    html: function(){
        res.render("produtos/form",{validationErrors:errors,produto:produto});
    },
    json: function(){
        res.send(errors);
    }
  });
   */

  const PAGAMENTO_CRIADO = "CRIADO";
  const PAGAMENTO_CONFIRMADO = "CONFIRMADO";
  const PAGAMENTO_CANCELADO = "CANCELADO";

  //Content negotiation -> ver retornos de formatos json e xml
  app.post('/pagamentos/pagamento', function(req, res){

    req.assert("forma_de_pagamento",
        "Forma de pagamento eh obrigatorio").notEmpty();
    req.assert("valor",
      "Valor eh obrigatorio e deve ser um decimal")
        .notEmpty().isFloat();

    var erros = req.validationErrors();

    if (erros){
      console.log('Erros de validacao encontrados');
      res.status(400).send(erros);
      return;
    }

    var pagamento = req.body;
    console.log('processando uma requisicao de um novo pagamento');

    var cartoesClient = new app.servicos.CartoesClient();
    cartoesClient.autoriza(req.body['cartao'], function (err, request, response, retorno) {
      if (err){
        console.log("Erro ao consultar serviço de cartões.");
        res.status(400).send(err);
        return;
      }
      console.log('Retorno do servico de cartoes: %j', retorno);
    });

    pagamento.status = PAGAMENTO_CRIADO;
    pagamento.data = new Date;

    var connection = app.persistencia.connectionFactory();
    var pagamentoDao = new app.persistencia.PagamentoDao(connection);

    pagamentoDao.salva(pagamento, function(erro, resultado){
      if(erro){
        console.log('Erro ao inserir no banco:' + erro);
        res.status(500).send(erro);
      } else {
      console.log('pagamento criado');
      res.location('/pagamentos/pagamento/' +
            resultado.insertId);

      res.status(201).json(pagamento);
      var responseHATEOAS = {
        dados_do_pagamento: pagamento,
        links: [
                {
                    href: "http://localhost:3000/pagamentos/pagamento/" + pagamento.id,
                    rel: "confirmar",
                    method: "PUT"
                },
                {
                    href: "http://localhost:3000/pagamentos/pagamento/" + pagamento.id,
                    rel: "cancelar",
                    method: "DELETE"
                }
            ]
        }
      res.status(201).json(responseHATEOAS);
    }
    });

  });

  app.put('/pagamentos/pagamento/:id', function(req, res){

    var pagamento = {};
    var id = req.params.id;

    pagamento.id = id;
    pagamento.status = PAGAMENTO_CONFIRMADO;

    var connection = app.persistencia.connectionFactory();
    var pagamentoDao = new app.persistencia.PagamentoDao(connection);

    pagamentoDao.atualiza(pagamento, function(erro){
        if (erro){
          res.status(500).send(erro);
          return;
        }
        console.log('pagamento criado');
        res.send(pagamento);
    });

  });

  app.delete('/pagamentos/pagamento/:id', function(req, res){
    var pagamento = {};
    var id = req.params.id;

    pagamento.id = id;
    pagamento.status = CANCELADO;

    var connection = app.persistencia.connectionFactory();
    var pagamentoDao = new app.persistencia.PagamentoDao(connection);

    pagamentoDao.atualiza(pagamento, function(erro){
        if (erro){
          res.status(500).send(erro);
          return;
        }
        console.log('pagamento cancelado');
        res.status(204).send(pagamento);
    });
  });
}
