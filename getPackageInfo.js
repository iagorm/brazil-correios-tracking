const request = require('request');
const cheerio = require('cheerio');
const { formatDate, formatLocal, formatHour, formatType, formatDescription } = require('./formatters');

function getPackageInfo(packNum) {
    return new Promise((resolve, reject) => {
        request.post(
            {
                encoding: 'latin1',
                url: 'https://www2.correios.com.br/sistemas/rastreamento/resultado_semcontent.cfm',
                formData: {
                    Objetos: packNum,
                },
            },
            (error, response, body) => {
                if (error) return reject(error);

                let progress = 0;
                let $ = cheerio.load(body, { decodeEntities: false });
                let TABLE_ROWS = $('table > tbody > tr').length;

                if (TABLE_ROWS <= 0) {
                    return reject({ message: 'code dont exist!' });
                }

                const packHistory = new Array(TABLE_ROWS).fill().map((_, i) => {
                    const TABLE_ROW = $(`table > tbody > tr:nth-of-type(${i + 1})`);
                    const INFO_ROW = TABLE_ROW.children()
                        .html()
                        .split(' ')
                        .join('')
                        .replace(/[\s]/gim, '')
                        .replace(/<(?:[^>=]|='[^']*'|="[^"]*"|=[^'"][^\s>]*)*>/gim, '');
                    const DETAILS_ROW = TABLE_ROW.children()
                        .next()
                        .html();

                    return {
                        info: {
                            date: new Date(formatDate(INFO_ROW)),
                            local: formatLocal(INFO_ROW),
                            hour: formatHour(INFO_ROW),
                        },
                        type: formatType(DETAILS_ROW),
                        description: formatDescription(DETAILS_ROW),
                    };
                });

                packHistory.some(historyElement => {
                    switch (historyElement.type) {
                        case 'Objeto entregue ao destinatário':
                            return (progress = 100);

                        case 'Objeto saiu para entrega ao destinatário':
                            return (progress = 90);

                        case 'Objeto postado':
                            return (progress = 10);

                        default:
                            return (progress = 50);
                    }
                });

                resolve({ progress, packHistory });
            }
        );
    });
}

function sortByAsc(previousPack, nextPack){
    const prev = new Date(previousPack.info.date);
    const next = new Date(nextPack.info.date);


    return prev.getTime() >= next.getTime() ? -1 : 1;
}

function sortByDesc(previousPack, nextPack){
    const prev = new Date(previousPack.info.date);
    const next = new Date(nextPack.info.date);

    return prev.getTime() <= next.getTime() ? -1 : 1;
}

function sortProgressAsc(previousPack, nextPack){

   return previousPack.progress > nextPack.progress ? -1 : 1
}
function sortProgressDesc(previousPack, nextPack){

    return previousPack.progress < nextPack.progress ? -1 : 1
}

module.exports = {
    getPackageInfo,
    sortByAsc,
    sortByDesc,
    sortProgressAsc,
    sortProgressDesc
};
