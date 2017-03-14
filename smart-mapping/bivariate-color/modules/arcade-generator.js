define([], function(){

  return {

    test: function() {
      console.log("hello world");
    },

    getArcade: function(params) {
      var field1 = params.field1;
      var normField1 = params.normField1;
      var field2 = params.field2;
      var normField2 = params.normField2;
      var field1Breaks = JSON.stringify(params.field1Breaks);
      var field2Breaks = JSON.stringify(params.field2Breaks);
      var classes = params.field1Breaks.length;

      if (!field1 || !field2 || !field1Breaks || !field2Breaks){
        console.error("Two fields and two sets of breaks must be specified.");
        return;
      }

      if(classes !== params.field2Breaks.length){
        console.error("The number of class breaks for both fields must match.");
        return;
      }

      var arcade = [
        'var field1 = $feature.', field1, ';\n',
        'var normField1 = ', normField1 ? '$feature.' + normField1 + ';\n' : 'null;\n',
        'var field2 = $feature.', field2, ';\n',
        'var normField2 = ', normField2 ? '$feature.' + normField2 + ';\n' : 'null;\n',
        'var classes = ', classes, ';\n',

        'var field1Val = IIf(IsEmpty(normField1), field1, (field1 / normField1));\n',
        'var field2Val = IIf(IsEmpty(normField2), field2, (field2 / normField2));\n\n',

        'var field1Breaks = ', field1Breaks, ';\n\n',
        'var field2Breaks = ', field2Breaks, ';\n\n',

        'function getFieldCode (value, breaks, letter) {\n',
        '  var code = "Other";\n',
        '  for (var i in breaks){\n',
        '    code = IIf (value >= breaks[i].minValue && IIf(classes == i+1, value <= breaks[i].maxValue, value < breaks[i].maxValue), i+1, code);\n',
        '  }\n',
        '  code = IIf (letter, Decode( code, 1, "A", 2, "B", 3, "C", 4, "D", "Other" ), code);\n',
        '  return code;\n',
        '}\n\n',

        'var field1Code = getFieldCode(field1Val, field1Breaks, false);\n',
        'var field2Code = getFieldCode(field2Val, field2Breaks, true);\n',

        'var code = IIf(field1Code == "Other" || field2Code == "Other", "Other", field2Code + field1Code);\n',

        'return code;'
      ].join('');

      return arcade;
    },

    getGroupBySQL: function(params){
      var field1 = params.field1;
      var normField1 = params.normField1;
      var field2 = params.field2;
      var normField2 = params.normField2;
      var field1Breaks = params.field1Breaks;
      var field2Breaks = params.field2Breaks;

      var field1Val = normField1 ? (field1 + "/" + normField1) : field1;
      var field2Val = normField2 ? (field2 + "/" + normField2) : field2;

      var sql = [ "CASE" ];

      field2Breaks.forEach(function(field2Break, i){
        field1Breaks.forEach(function(field1Break, j){
          var field2Code;
          switch (i){
            case 0:
              field2Code = "A";
              break;
            case 1:
              field2Code = "B";
              break;
            case 2:
              field2Code = "C";
              break;
            case 3:
              field2Code = "D";
              break;
            default:
              field2Code = null;
          }
          var field1Code = ++j;

          sql.push( " WHEN ", field1Val, " >= ", field1Break.minValue, " AND ", field1Val, " < ", field1Break.maxValue,
               " AND ", field2Val, " >= ", field2Break.minValue, " AND ", field2Val, " < ", field2Break.maxValue,
                  " THEN '",  field2Code + field1Code, "'");
        });
      });

      sql.push( " ELSE 'Other' END" );
      sql = sql.join("");

      return sql;
    },

    getOnStatisticFieldSQL: function(params){
      var field1 = params.field1;
      var normField1 = params.normField1;
      var field2 = params.field2;
      var normField2 = params.normField2;
      var field1Breaks = params.field1Breaks;
      var field2Breaks = params.field2Breaks;

      var field1Val = normField1 ? (field1 + "/" + normField1) : field1;
      var field2Val = normField2 ? (field2 + "/" + normField2) : field2;

      var sql = [ "CASE" ];

      field2Breaks.forEach(function(field2Break, i){
        field1Breaks.forEach(function(field1Break, j){

          sql.push( " WHEN ", field1Val, " >= ", field1Break.minValue, " AND ", field1Val, " < ", field1Break.maxValue,
               " AND ", field2Val, " >= ", field2Break.minValue, " AND ", field2Val, " < ", field2Break.maxValue,
                  " THEN 1");
        });
      });

      sql.push( " ELSE 1 END" );
      sql = sql.join("");

      return sql;
    },

    getSqlStats: function(params){
      var onStatField = params.onStatField;
      var groupBy = params.groupBy;

      var outputStats = [{
        statisticType: "count",
        outStatisticFieldName: "bivariate count",
        onStatisticField: onStatField
      }];

      return {
        outStatistics: outputStats,
        groupByFieldsForStatistics: groupBy,
        orderByFields: groupBy
      };
    }

  };
});