const $mysql = require('mysql');
const $promise = require("bluebird");

const $sql = function(){
    var self = this;
    this.pool = null;
    this.dbConfig = null;

    this.init = function(dbConfig){
        if(!dbConfig) dbConfig = self.dbConfig;
        if(dbConfig!==null){
            self.dbConfig = dbConfig;
            self.pool  = $mysql.createPool(self.dbConfig);
        }
    };

    this.connect = function() {
        return new $promise((resolve, reject) => {
            self.pool.getConnection(function (err, con) {
                if (err) reject(err);
                con.execute = function (strSQL) {
                    return new $promise((resolve, reject) => {
                        con.query(strSQL, function (err, rows, fields) {
                            if (err) {
                                console.log(err);
                                reject(err);
                            }
                            resolve(rows);
                        });
                    });
                };
                con.transaction = function (arySQL) {
                    return new $promise((resolve, reject) => {
                        var lngSQL = arySQL.length;

                        if (lngSQL > 0) {
                            var currentPosition = 0;

                            var runQuery = function () {
                                if (lngSQL === currentPosition) {
                                    con.commit(function (err) {
                                        if (err) con.rollback(function () {
                                            reject(err);
                                        });
                                        resolve('success!');
                                    })
                                } else {
                                    con.execute(arySQL[currentPosition]).then(function (rows) {
                                        currentPosition++;
                                        runQuery();
                                    },function (err) {
                                        con.rollback(function () {
                                            reject(err);
                                        });
                                    });
                                }
                            };

                            con.beginTransaction(function (err) {
                                if (err) reject(err);
                                runQuery();
                            });
                        } else {
                            reject('Nothing to change or add.');
                        }
                    });
                };
                resolve(con);
            });
        });
    };

    this.init();
};

module.exports = new $sql();