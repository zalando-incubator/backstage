/*
 * Copyright 2021 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { JsonObject } from '@backstage/config';
import { FormProps } from '@rjsf/core';

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractUiSchema(schema: JsonObject, uiSchema: JsonObject) {
  const { properties } = schema;
  if (!isObject(properties)) {
    return;
  }
  for (const propName in properties) {
    if (!properties.hasOwnProperty(propName)) {
      continue;
    }
    const schemaNode = properties[propName];
    if (!isObject(schemaNode)) {
      continue;
    }

    if (schemaNode.type === 'object') {
      const innerUiSchema = {};
      uiSchema[propName] = innerUiSchema;
      extractUiSchema(schemaNode, innerUiSchema);
    } else {
      for (const innerKey in schemaNode) {
        if (!schemaNode.hasOwnProperty(innerKey)) {
          continue;
        }
        const innerValue = schemaNode[innerKey];
        if (innerKey.startsWith('ui:')) {
          const innerUiSchema = uiSchema[propName] || {};
          if (!isObject(innerUiSchema)) {
            throw new TypeError('Unexpected non-object in uiSchema');
          }
          uiSchema[propName] = innerUiSchema;

          innerUiSchema[innerKey] = innerValue;
          delete schemaNode[innerKey];
        }
      }
    }
  }
}

export function transformSchemaToProps(
  inputSchema: JsonObject,
): { schema: FormProps<any>['schema']; uiSchema: FormProps<any>['uiSchema'] } {
  inputSchema.type = inputSchema.type || 'object';
  const schema = JSON.parse(JSON.stringify(inputSchema));
  delete schema.title; // Rendered separately
  const uiSchema = {};
  extractUiSchema(schema, uiSchema);
  return { schema, uiSchema };
}
