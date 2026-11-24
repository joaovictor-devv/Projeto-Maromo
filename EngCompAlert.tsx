
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import 'react-native-url-polyfill/auto';


const SUPABASE_URL = 'https://ruuvpzbajjmtkcyajcxn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_v6d6K54flAI1CgE4WqnPng_0s46-_fy';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

type Aviso = {
  id: number;
  title: string;
  message: string;
  created_at: string;
};

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [modoCadastro, setModoCadastro] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCarregando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setAvisos([]);
      return;
    }

    carregarAvisos();

    const canal = supabase
      .channel('avisos-em-tempo-real')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => carregarAvisos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [session]);

  async function carregarAvisos() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar os avisos.');
      return;
    }

    setAvisos(data || []);
  }

  async function entrarOuCadastrar() {
    if (!email.trim() || !senha.trim()) {
      Alert.alert('Atenção', 'Preencha o e-mail e a senha.');
      return;
    }

    setCarregando(true);

    const resultado = modoCadastro
      ? await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
        })
      : await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        });

    setCarregando(false);

    if (resultado.error) {
      Alert.alert('Atenção', resultado.error.message);
      return;
    }

    if (modoCadastro && !resultado.data.session) {
      Alert.alert(
        'Cadastro realizado',
        'Confira seu e-mail para confirmar o cadastro.'
      );
    }
  }

  async function enviarAviso() {
    if (!titulo.trim() || !mensagem.trim()) {
      Alert.alert('Atenção', 'Preencha o título e a mensagem.');
      return;
    }

    setEnviando(true);

    const { error } = await supabase.from('notifications').insert({
      title: titulo.trim(),
      message: mensagem.trim(),
    });

    setEnviando(false);

    if (error) {
      Alert.alert('Erro ao enviar', error.message);
      return;
    }

    setTitulo('');
    setMensagem('');
    Alert.alert('Sucesso', 'Aviso enviado!');
    carregarAvisos();
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  if (carregando) {
    return (
      <View style={styles.centralizado}>
        <ActivityIndicator size="large" color="#6554A4" />
        <Text style={styles.textoCarregando}>Carregando...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.telaLogin}>
        <Text style={styles.logo}>EngComp Alert</Text>
        <Text style={styles.subtitulo}>
          Comunicação em tempo real
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Seu e-mail"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Sua senha"
          placeholderTextColor="#888"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.botao}
          onPress={entrarOuCadastrar}
        >
          <Text style={styles.textoBotao}>
            {modoCadastro ? 'Criar conta' : 'Entrar'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setModoCadastro(!modoCadastro)}
        >
          <Text style={styles.link}>
            {modoCadastro
              ? 'Já tenho uma conta. Fazer login'
              : 'Ainda não tenho conta. Cadastrar'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <View>
          <Text style={styles.logoPequeno}>EngComp Alert</Text>
          <Text style={styles.subtituloClaro}>
            Central de comunicados
          </Text>
        </View>

        <TouchableOpacity onPress={sair}>
          <Text style={styles.sair}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.conteudo}>
        <Text style={styles.tituloSecao}>Enviar novo aviso</Text>

        <TextInput
          style={styles.input}
          placeholder="Título do aviso"
          placeholderTextColor="#888"
          value={titulo}
          onChangeText={setTitulo}
        />

        <TextInput
          style={[styles.input, styles.campoMensagem]}
          placeholder="Digite sua mensagem..."
          placeholderTextColor="#888"
          value={mensagem}
          onChangeText={setMensagem}
          multiline
        />

        <TouchableOpacity
          style={styles.botao}
          onPress={enviarAviso}
          disabled={enviando}
        >
          <Text style={styles.textoBotao}>
            {enviando ? 'Enviando...' : 'Enviar aviso'}
          </Text>
        </TouchableOpacity>

        <View style={styles.linhaTitulo}>
          <Text style={styles.tituloSecao}>Avisos recebidos</Text>
          <Text style={styles.quantidade}>{avisos.length}</Text>
        </View>

        <FlatList
          data={avisos}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={
            <Text style={styles.vazio}>
              Nenhum aviso recebido ainda.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.cartaoAviso}>
              <Text style={styles.tituloAviso}>{item.title}</Text>
              <Text style={styles.mensagemAviso}>
                {item.message}
              </Text>
              <Text style={styles.dataAviso}>
                {new Date(item.created_at).toLocaleString('pt-BR')}
              </Text>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F2F8',
  },
  centralizado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoCarregando: {
    marginTop: 12,
    color: '#6554A4',
  },
  telaLogin: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#F3F2F8',
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6554A4',
    textAlign: 'center',
  },
  subtitulo: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDD9EA',
    color: '#222',
  },
  campoMensagem: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  botao: {
    backgroundColor: '#6554A4',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  textoBotao: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  link: {
    color: '#6554A4',
    textAlign: 'center',
    marginTop: 8,
  },
  cabecalho: {
    backgroundColor: '#6554A4',
    padding: 22,
    paddingTop: 55,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoPequeno: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: 'bold',
  },
  subtituloClaro: {
    color: '#E8E3F8',
    marginTop: 4,
  },
  sair: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  conteudo: {
    flex: 1,
    padding: 18,
  },
  tituloSecao: {
    color: '#332B50',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  linhaTitulo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  quantidade: {
    color: '#6554A4',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  cartaoAviso: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6554A4',
  },
  tituloAviso: {
    color: '#332B50',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  mensagemAviso: {
    color: '#555',
    fontSize: 14,
  },
  dataAviso: {
    color: '#999',
    fontSize: 11,
    marginTop: 10,
  },
  vazio: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
});
