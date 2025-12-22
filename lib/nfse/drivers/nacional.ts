import type { NFse } from '../types';
import { EnderecoNacional } from '../types';


export class NacionalNFSeDriver { 

    static buildPayload(nfse: NFse) {
        const payload = {
            NFSe : {
                infNFSe: {
                    DPS: {
                        infDPS: {
                            ide: this.buildIdentificacao(nfse),
                            prest: this.buildPrestador(nfse),
                            toma: this.buildTomador(nfse),
                            serv: this.buildServico(nfse),
                            valores: this.buildValores(nfse),
                            impostos: this.buildImpostos(nfse)
                        },
                    },
                },
            },
        };

        return payload;
    }


    // identifica NFse
    private static buildIdentificacao(nfse: NFse) {
        return {
            numero: nfse.identificacao.numero,
            serie: nfse.identificacao.serie,
            dataEmissao: nfse.identificacao.dataEmissao,
        };
    }

    //identifica prestador
    private static buildPrestador(nfse: NFse) {
        const p = nfse.prestador
        return {
            CNPJ: p.cnpj,
            CPF: p.cpf,
            IM: p.inscricaoMunicipal,
            xNome: p.razaoSocial,
            end: p.endereco ? this.buildEndereco(p.endereco) : undefined,
            email: p.contato.email,
            fone: p.contato.telefone
        }
    }

    //identifica tomador
    private static buildTomador(nfse: NFse) {
        const t = nfse.tomador
        return {
            CNPJ: t.cnpj,
            CPF: t.cpf,
            IM: t.inscricaoMunicipal,
            xNome: t.razaoSocial,
            end: t.endereco ? this.buildEndereco(t.endereco) : undefined,
            //contato: t.contato ? this.buildContato(t.contato) : undefined
            email: t.contato.email,
            fone: t.contato.telefone
        }
    }

    //identifica serviço
    private static buildServico(nfse: NFse) {
        const s = nfse.servico
        return {
            cServ: s.codigoServico,
            xDescServ: s.descricao,
            cMunInc: s.codigoMunicipioIncidencia, //.
            qServ: s.quantidade, //.
            uMed: s.unidade //.
        }
    }

    //identifica valores
    private static buildValores(nfse: NFse) {
        const v = nfse.valores;

        return {
            vServ: v.valorServicos, //.
            vDescIncond: v.descontoIncondicionado,
            vDescCond: v.descontoCondicionado,
            vDeduc: v.deducoes, //.
            vLiq: v.valorLiquido //.
        };
    }

    //identifica Impostos
    private static buildImpostos(nfse: NFse) {
        const i = nfse.impostos;

        return {
            ISS: i.iss
                ? {
                    aliq: i.iss.aliquota,
                    vImp: i.iss.valor,
                    ret: i.iss.retido,
                }
                : undefined,

            IBS: i.ibs
                ? {
                    aliq: i.ibs.aliquota,
                    vImp: i.ibs.valor,
                }
                : undefined,

            CBS: i.cbs
                ? {
                    aliq: i.cbs.aliquota,
                    vImp: i.cbs.valor,
                }
                : undefined,
        };
    }

    //identifica endereço
    private static buildEndereco(endereco: EnderecoNacional) {
        return {
            endNac: {
                cMun: endereco.codigoMunicipio,
                CEP: endereco.cep
            }
        }
    }

    /*identifica contato
    private static buildContato(contato: any) {
        return {
            email: contato.email,
            fone: contato.telefone
        }
    } */

 
}