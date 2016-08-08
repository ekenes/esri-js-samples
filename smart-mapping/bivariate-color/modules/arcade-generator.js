define([], function(){

  return {
    test: function(){
      console.log("this is a test");
    },


    getArcade: function(params) {
      var field1 = params.field1;
      var normField1 = params.normField1;
      var field2 = params.field2;
      var normField2 = params.normField2;
      var field1Breaks = JSON.stringify(params.field1Breaks);
      var field2Breaks = JSON.stringify(params.field2Breaks);
      var classes = params.field1Breaks.length;

      var arcade = [
        'var field1 = $feature.', field1, ';\n',
        'var normField1 = ', normField1 ? '$feature.' + normField1 + ';\n' : 'null;\n',
        'var field2 = $feature.', field2, ';\n',
        'var normField2 = ', normField2 ? '$feature.' + normField2 + ';\n' : 'null;\n',
        'var classes = ', classes, ';\n',
        'var field1Code, field2Code;\n',

        'var field1Val = IIf(IsEmpty(normField1), field1, (field1 / normField1));\n',
        'var field2Val = IIf(IsEmpty(normField2), field2, (field2 / normField2));\n\n',

        'var field1Breaks = ', field1Breaks, ';\n\n',
        'var field2Breaks = ', field2Breaks, ';\n\n',

        'field1Code = IIf( classes == 3, \n',
                       'IIf( field1Val <= field1Breaks[0].maxValue, "A", \n',
                       'IIf( field1Val > field1Breaks[2].minValue, "C", "B" ) ), \n',
                       '  IIf( field1Val <= field1Breaks[0].maxValue, "A", \n',
                       '  IIf( field1Val > field1Breaks[3].minValue, "D", \n',
                       '  IIf( field1Val <= field1Breaks[1].maxValue && field1Val > field1Breaks[1].minValue, "B", "C" ) ) ) );\n\n',
        'field2Code = IIf( classes == 3, \n',
                       'IIf( field2Val <= field2Breaks[0].maxValue, "1", \n',
                       'IIf( field2Val > field2Breaks[2].minValue, "3", "2" ) ), \n',
                       '  IIf( field2Val <= field2Breaks[0].maxValue, "1", \n',
                       '  IIf( field2Val > field2Breaks[3].minValue, "4", \n',
                       '  IIf( field2Val <= field2Breaks[1].maxValue && field2Val > field2Breaks[1].minValue, "2", "3" ) ) ) );\n\n',

        'var code = field1Code + field2Code;\n',

        'return code;'
      ].join('');

      return arcade;
    }
  };
});