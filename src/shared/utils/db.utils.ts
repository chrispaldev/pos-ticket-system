import { Document, Types } from 'mongoose';
import { BadRequestException } from '@nestjs/common';
import { capitalize } from './';

export const createMongoId = () => new Types.ObjectId;

export const castToMongoId = (id: string) => new Types.ObjectId(id);

export const getModelFactory = (schema) => {
  return () => {
    schema.post(/find/, function (docs: any) {
      if (this._mongooseOptions.lean) {
        if (Array.isArray(docs)) {
          docs.forEach(doc => {
            delete doc.__v;
          })
        }
        else if (docs) delete docs.__v;
        return docs;
      }
    });
    schema.post('save', (error: any, doc: Document, next: any) => {
      mongooseErrorHandler(error);
    });
    schema.post(/findOneAndUpdate|updateOne|updateMany/, (error: any, doc: Document, next: any) => {
      mongooseErrorHandler(error);
    });
    return schema;
  }
};

export const getSchemaOptions = () => {
  return { 
    timestamps: true,
    toJSON: {
      transform: (_, obj) => {
        delete obj.__v;
      }
    },
    toObject: {
      transform: (_, obj) => {
        delete obj.__v;
      }
    },
  }
}

export const getSubSchemaOptions = () => {
  return { 
    _id: false, 
    versionKey: false, 
    timestamps: false,
  }
}

export const mongooseErrorHandler = (error: any) => {
  const errors = [];
  if (error.name === 'ValidationError') {
    for (const field in error.errors) {
      if (error.errors[field].name == 'CastError') {
        errors.push({
          param: error.errors[field].path,
          msg: `${capitalize(error.errors[field].path)} type is invalid`,
        });
      }
      if (error.errors[field].name == 'ValidatorError') {
        if (error.errors[field].kind == 'required') {
          errors.push({
            param: error.errors[field].path,
            msg: `${capitalize(error.errors[field].path)} is required`,
          });
        } else if (['min', 'max'].includes(error.errors[field].kind)) {
          const matches = error.errors[field].message.match(/\((\d+)\)/g);
          const allowedCharacters = matches[matches.length - 1];
          errors.push({
            param: error.errors[field].path,
            msg: `${capitalize(error.errors[field].path)} ${
              error.errors[field].kind == 'min'
                ? 'must not be less than ' + allowedCharacters
                : 'must not exceed ' + allowedCharacters
            }`,
          });
        } else if (['minlength', 'maxlength'].includes(error.errors[field].kind)) {
          const matches = error.errors[field].message.match(/\((\d+)\)/g);
          const allowedCharacters = matches[matches.length - 1];
          errors.push({
            param: error.errors[field].path,
            msg: `${capitalize(error.errors[field].path)} ${
              error.errors[field].kind == 'minlength'
                ? 'must not be less than ' + allowedCharacters + ' characters'
                : 'must not exceed ' + allowedCharacters + ' characters'
            }`,
          });
        } else if (error.errors[field].kind == 'enum') {
          errors.push({
            param: error.errors[field].path,
            msg:
              `${capitalize(error.errors[field].path)} must be one of these` +
              ` [${error.errors[field].properties.enumValues}]`,
          });
        } else {
          errors.push({
            param: error.errors[field].path,
            msg: `${capitalize(error.errors[field].path)} is invalid`,
          });
        }
      }
    }
  } else if (error.name === 'MongoServerError') {
    if (error.code === 11000) {
      errors.push({
        param: Object.keys(error.keyPattern)[0],
        msg: `${capitalize(Object.keys(error.keyPattern)[0])} already exists`,
      });
    }
  }
  throw new BadRequestException(errors, 'Validation Error');
};
