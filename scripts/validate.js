const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { globSync } = require('glob');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schemasDir = path.join(__dirname, '../cmdb-repo/schemas');
const schemaFiles = fs.readdirSync(schemasDir).filter(f => f.endsWith('.json'));

const schemas = {};
schemaFiles.forEach(file => {
  const schema = JSON.parse(fs.readFileSync(path.join(schemasDir, file), 'utf8'));
  const kind = schema.properties.kind.const;
  schemas[kind] = ajv.compile(schema);
  console.log(`Loaded schema for kind: ${kind}`);
});

const tenantFiles = globSync('cmdb-repo/tenants/**/*.yaml');
let hasErrors = false;

tenantFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const data = yaml.load(content);

    if (!data || !data.kind) {
      console.error(`Error in ${file}: Missing 'kind' field.`);
      hasErrors = true;
      return;
    }

    const validate = schemas[data.kind];
    if (!validate) {
      console.error(`Error in ${file}: Unknown kind '${data.kind}'.`);
      hasErrors = true;
      return;
    }

    const valid = validate(data);
    if (!valid) {
      console.error(`Validation failed for ${file}:`);
      console.error(ajv.errorsText(validate.errors, { separator: '\n', dataVar: 'item' }));
      hasErrors = true;
    } else {
      console.log(`✓ ${file} is valid.`);
    }
  } catch (e) {
    console.error(`Failed to parse ${file}: ${e.message}`);
    hasErrors = true;
  }
});

if (hasErrors) {
  process.exit(1);
} else {
  console.log('\nAll files validated successfully.');
}
