
// import { NacionalNFSeDriver } from '@/lib/nfse/drivers/nacional';


// export async function POST(req: Request) {
//   const nfse = await req.json();

//   const payload = NacionalNFSeDriver.buildPayload(nfse);

//   console.log('NFSe Payload Nacional:', JSON.stringify(payload, null, 2));

//   return Response.json({
//     success: true,
//     payload,
//   });
// }


import { NacionalNFSeDriver } from '@/lib/nfse/drivers/nacional';
import type { NFse } from '@/lib/nfse/types';

export async function POST() {
  const nfse: NFse = {
    id: 'nfse-teste',

    identificacao: {
      numero: '1',
      serie: 'A',
      dataEmissao: new Date().toISOString(),
    },

    prestador: {
      cnpj: '12345678000199',
      razaoSocial: 'EMPRESA TESTE LTDA',
      endereco: {
        cep: '99999',
        codigoMunicipio: '4343434'
      },
      contato: {
        email: 'teste@gmail.com'
      }
    },

    tomador: {
      cpf: '12345678901',
      razaoSocial: 'CLIENTE TESTE',
      endereco: {
        cep: '99890000',
        codigoMunicipio: '22222'
      },
      contato: {
        email: 'teste@gmail'
      }
    },

    servico: {
      codigoServico: '01.01',
      descricao: 'Serviço de teste',
      codigoMunicipioIncidencia: '4205407',
    },

    valores: {
      valorServicos: 100,
    },

    impostos: {
        cbs: {
            aliquota: 5,
            valor: 5
        }
    },
  };

  const payload = NacionalNFSeDriver.buildPayload(nfse);

  console.log(JSON.stringify(payload, null, 2));

  return Response.json(payload);
}
