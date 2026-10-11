import { describe, expect, it } from 'vitest'
import {
  fieldErrors,
  forgotPasswordSchema,
  passwordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from './schemas'
import { destinationFor, homeFor, safeNext } from './redirect'

describe('safeNext (open redirect)', () => {
  it.each([
    ['/studio', '/studio'],
    ['/studio/alunos?busca=ana', '/studio/alunos?busca=ana'],
    ['/aluno/treino/123#serie-2', '/aluno/treino/123#serie-2'],
  ])('aceita caminho interno %s', (input, expected) => {
    expect(safeNext(input)).toBe(expected)
  })

  it.each([
    'https://evil.example/phish',
    'http://evil.example',
    '//evil.example',
    '///evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    '/studio\nSet-Cookie: x=1',
    '/\t/evil.example',
    '/%0d%0a//evil.example'.replace('%0d%0a', '\r\n'),
    'studio',
    '',
    '   ',
    '/' + 'a'.repeat(600),
  ])('rejeita %j e usa o destino padrão', (input) => {
    expect(safeNext(input, '/seguro')).toBe('/seguro')
  })

  it('trata null/undefined', () => {
    expect(safeNext(null, '/x')).toBe('/x')
    expect(safeNext(undefined, '/x')).toBe('/x')
  })
})

describe('destinationFor (área do papel)', () => {
  it('personal só é levado para /studio', () => {
    expect(destinationFor('trainer', '/studio/alunos')).toBe('/studio/alunos')
    expect(destinationFor('trainer', '/aluno')).toBe('/studio')
    expect(destinationFor('trainer', '/studiox')).toBe('/studio')
  })
  it('aluno só é levado para /aluno', () => {
    expect(destinationFor('student', '/aluno/treino/1')).toBe('/aluno/treino/1')
    expect(destinationFor('student', '/studio')).toBe('/aluno')
  })
  it('papel desconhecido volta ao login', () => {
    expect(destinationFor('admin', '/studio')).toBe('/entrar')
    expect(destinationFor(undefined, '/studio')).toBe('/entrar')
    expect(homeFor(null)).toBe('/entrar')
  })
  it('destino externo é ignorado', () => {
    expect(destinationFor('trainer', 'https://evil.example')).toBe('/studio')
  })
})

describe('schemas de autenticação', () => {
  const valid = { fullName: 'Ana Souza', email: ' ANA@Exemplo.com ', password: 'senha1234', role: 'trainer' }

  it('cadastro válido normaliza o e-mail', () => {
    const r = signUpSchema.safeParse(valid)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.email).toBe('ana@exemplo.com')
  })

  it('cadastro rejeita papel privilegiado ou inexistente', () => {
    for (const role of ['admin', 'service_role', 'TRAINER', '', undefined]) {
      expect(signUpSchema.safeParse({ ...valid, role }).success).toBe(false)
    }
  })

  it('cadastro rejeita nome curto e e-mail inválido', () => {
    const r = signUpSchema.safeParse({ ...valid, fullName: 'A', email: 'sem-arroba' })
    expect(r.success).toBe(false)
    if (!r.success) {
      const e = fieldErrors(r.error)
      expect(e.fullName).toBeTruthy()
      expect(e.email).toBeTruthy()
    }
  })

  it('senha: mínimo, letras e números, máximo de 72 bytes', () => {
    expect(passwordSchema.safeParse('curta1').success).toBe(false)
    expect(passwordSchema.safeParse('somenteletras').success).toBe(false)
    expect(passwordSchema.safeParse('123456789').success).toBe(false)
    expect(passwordSchema.safeParse('senha1234').success).toBe(true)
    expect(passwordSchema.safeParse('a1'.repeat(40)).success).toBe(false)
    // Limite em BYTES (bcrypt), não em caracteres: 72 caracteres com acento passam de 72 bytes.
    const manyBytes = 'aé1'.repeat(24) // 72 caracteres, 96 bytes
    expect(manyBytes.length).toBe(72)
    expect(new TextEncoder().encode(manyBytes).length).toBe(96)
    expect(passwordSchema.safeParse(manyBytes).success).toBe(false)
    // Controle: mesma composição, dentro do limite de bytes, é aceita.
    expect(passwordSchema.safeParse('aé1'.repeat(8)).success).toBe(true)
  })

  it('login não revela regras de senha, mas exige preenchimento', () => {
    expect(signInSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true)
    expect(signInSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false)
  })

  it('recuperação valida o e-mail', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'ana@exemplo.com' }).success).toBe(true)
    expect(forgotPasswordSchema.safeParse({ email: 'x' }).success).toBe(false)
  })

  it('redefinição exige confirmação igual', () => {
    expect(resetPasswordSchema.safeParse({ password: 'senha1234', confirm: 'senha1234' }).success).toBe(true)
    const r = resetPasswordSchema.safeParse({ password: 'senha1234', confirm: 'outra1234' })
    expect(r.success).toBe(false)
    if (!r.success) expect(fieldErrors(r.error).confirm).toMatch(/coincidem/)
  })
})
