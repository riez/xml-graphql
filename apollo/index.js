const { ApolloServer, gql } = require("apollo-server");
const { filmsDummyData } = require("./data-sample/films");
const fetch = require("isomorphic-fetch");
const xml2js = require("xml2js");

const parser = new xml2js.Parser({
  async: true,
  trim: true,
  normalize: true,
});

// Schmea definition
const typeDefs = gql`
  type Film {
    title: String
    author: String
    co_author: [String]
    release_date: Int
  }
  input FilmInput {
    title: String!
    author: String!
    co_author: [String]
    release_date: Int!
  }
  type Rate {
    code: String
    currency: String
    mid: Float
  }
  type Event {
    id: Int
    uri: String
    description: String
    descriptionType: String
    startTime: String
    endTime: String
  }
  type Language {
    isoCode: String
    name: String
  }
  type Query {
    getFilms: [Film]
    getFilmByAuthorName(authorName: String!): [Film]
    getRates: [Rate]
    getEventInBR: [Event]
    getLanguagesByName: [Language]
  }
  type Mutation {
    insertFilm(input: FilmInput!): Film
  }
`;

const resolvers = {
  Query: {
    getFilms: () => filmsDummyData,
    getFilmByAuthorName: (parent, args, context, info) => {
      const result = filmsDummyData.filter(
        (item) => item.author === args?.authorName
      );
      return result;
    },
    getRates: async () => {
      // API Documentation: https://api.nbp.pl/
      const request = await fetch(
        "http://api.nbp.pl/api/exchangerates/tables/A?format=xml"
      );
      const text = await request.text();
      const result = await parser.parseStringPromise(text);
      const data =
        result.ArrayOfExchangeRatesTable.ExchangeRatesTable[0].Rates[0].Rate;
      const finalData = data.map((item) => ({
        code: item.Code[0],
        currency: item.Currency[0],
        mid: Number(item.Mid[0]),
      }));
      return finalData;
    },
    getEventInBR: async () => {
      // API Documentation: https://dadosabertos.camara.leg.br/swagger/api.html
      const request = await fetch(
        "https://dadosabertos.camara.leg.br/api/v2/eventos?ordem=ASC&ordenarPor=dataHoraInicio",
        {
          headers: {
            accept: "application/xml",
          },
        }
      );
      const text = await request.text();
      const result = await parser.parseStringPromise(text);
      const data = result.xml.dados[0].evento_;
      const finalData = data.map((item) => ({
        id: item.id[0],
        uri: item.uri[0],
        description: item.descricao[0],
        descriptionType:item.descricaoTipo[0],
        startTime:item.dataHoraInicio[0],
        endTime: item.dataHoraFim[0],
      }))
      return finalData;
    },
    getLanguagesByName: async() => {
      // API Reference: http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso
      const request = await fetch("http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso/ListOfLanguagesByName");
      const text = await request.text();
      const result = await parser.parseStringPromise(text);
      const data = result.ArrayOftLanguage.tLanguage;
      const finalData = data.map((item) => ({
        isoCode: item.sISOCode[0],
        name: item.sName[0],
      }))
      return finalData;
    }
  },
  Mutation: {
    insertFilm: (parent, args, context, info) => {
      return args?.input;
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
