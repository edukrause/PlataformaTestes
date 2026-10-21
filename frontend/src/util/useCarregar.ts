import { useCallback, useEffect, useState } from 'react'

interface Carga<T> {
  dados: T | null
  erro: string | null
  carregando: boolean
  recarregar: () => void
}

/** Executa uma chamada assíncrona ao montar e sempre que as dependências mudarem. */
export function useCarregar<T>(fn: () => Promise<T>, deps: unknown[] = []): Carga<T> {
  const [dados, setDados] = useState<T | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [versao, setVersao] = useState(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const chamar = useCallback(fn, deps)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    chamar()
      .then((d) => ativo && (setDados(d), setErro(null)))
      .catch((e: unknown) => ativo && setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [chamar, versao])

  return { dados, erro, carregando, recarregar: () => setVersao((v) => v + 1) }
}
