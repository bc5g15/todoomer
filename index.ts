const template = await Bun.file('template.html').text();

const tsCode = await Bun.file('listModel.ts').text();

const transpiler = new Bun.Transpiler({
    loader: 'ts'
});

const result = transpiler.transformSync(tsCode);

const final = template.replace('<!--JS_GOES_HERE-->', result);
Bun.write('todoomer.html', final);