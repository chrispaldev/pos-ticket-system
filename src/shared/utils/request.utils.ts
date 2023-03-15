import axios, { AxiosInstance } from 'axios'
import { BadRequestException } from '@nestjs/common';

class RequestHelper {
  private request: AxiosInstance
  
  constructor(token: string) {
    const request = axios.create({});
    request.defaults.headers.common['X-Auth-Token'] = token;
    request.defaults.timeout = 10000;
    request.interceptors.response.use(this.handleSuccess, this.handleError);
    this.request = request;
  }

  handleSuccess(response: any) {
    return response.data
  }

  handleError(error: any) {
    if (error.response) {
      throw new BadRequestException(error.response.data.message || error.response.data.msg || 'An error occured');
    }
    else if (error.request) throw new BadRequestException('No response');
    else throw new BadRequestException(error.message);
  }
  
  async get(url: string, config: any = {}): Promise<any> {
    return await this.request.get(url, config);
  }

  async post(url: string, data: any, config = {}): Promise<any> {
    return await this.request.post(url, data, config);
  }

  async put(url: string, data: any, config = {}): Promise<any> {
    return await this.request.put(url, data, config);
  }

  async patch(url: string, data: any, config = {}): Promise<any> {
    return await this.request.patch(url, data, config);
  }

  async delete(url: string, config: any = {}): Promise<any> {
    return await this.request.delete(url, config);
  }
}

export const requestHelper = new RequestHelper('')