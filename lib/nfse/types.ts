
export interface EnderecoNacional {
    logradouro?: string,
    numero?: string,
    complemento?: string,
    bairro?: string,

    codigoMunicipio: string,
    municipio?: string,
    uf?: string,
    cep: string
}


export interface Contato {
    email: string,
    telefone?: string
}


export interface Servico {
    codigoServico: string,
    descricao: string,
    codigoMunicipioIncidencia: string,
    quantidade?: number,
    unidade?: string
}

export interface ValoresNFse {
    valorServicos: number,
    descontoIncondicionado?: number,
    descontoCondicionado?: number,
    deducoes?: number,
    valorLiquido?: number
}

export interface Impostos {
    iss?: ISS,
    ibs?: IBS,
    cbs?: CBS
}

export interface ISS {
    aliquota?: number,
    valor?: number,
    retido?: boolean
}

export interface IBS {
    aliquota?: number,
    valor?: number
}

export interface CBS {
    aliquota?: number,
    valor?: number
}

export interface NFse {
    id: string; 

    identificacao: {
        numero?: string,
        serie?: string,
        dataEmissao: string,
    };

    prestador: {
        cpf?: string,
        cnpj?: string,
        inscricaoMunicipal?: string,
        razaoSocial: string,
        nomeFantasia?: string,
        endereco?: EnderecoNacional,
        contato?: Contato
    };

    tomador: {
        cpf?: string,
        cnpj?: string,
        inscricaoMunicipal?: string,
        razaoSocial: string,
        nomeFantasia?: string,
        endereco?: EnderecoNacional,
        contato?: Contato
    };

    servico: Servico;
    valores: ValoresNFse;
    impostos: Impostos;

}