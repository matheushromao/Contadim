import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

/** Hash de senhas com argon2id (parâmetros padrão recomendados pela biblioteca). */
@Injectable()
export class PasswordService {
  private dummyHash?: Promise<string>;

  hash(password: string): Promise<string> {
    return hash(password);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  /**
   * Executa uma verificação "de mentira" quando o e-mail não existe, para que o tempo
   * de resposta não revele quais e-mails estão cadastrados.
   */
  async verifyDummy(password: string): Promise<false> {
    this.dummyHash ??= hash('contadim-dummy-password');
    await this.verify(await this.dummyHash, password);
    return false;
  }
}
