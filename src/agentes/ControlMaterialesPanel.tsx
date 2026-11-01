import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { AvisoSinConexion } from '../compartido/AvisoSinConexion';
import { EstadoChip } from '../compartido/EstadoChip';
import { formatearFechaHora } from '../nucleo/formato';
import { SEVERIDAD, textoTipoHallazgo, useControlMateriales, type Hallazgo, type Sugerencia } from './agentes.graphql';

// Panel «Control de materiales» del stock por obra (502, criterio 18): hallazgos vigentes (los de la última
// ejecución terminada del agente) y sugerencias pendientes de la obra elegida. El servicio de IA solo devuelve
// lo que el usuario puede ver (el residente, sus obras).

function HallazgoItem({ h }: { h: Hallazgo }) {
  return (
    <Paper component="li" variant="outlined" aria-label={`Hallazgo: ${textoTipoHallazgo(h.tipo)}`} sx={{ p: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ fontWeight: 600 }}>{textoTipoHallazgo(h.tipo)}</Typography>
        <EstadoChip etiqueta={`Severidad ${SEVERIDAD[h.severidad].etiqueta.toLowerCase()}`} tono={SEVERIDAD[h.severidad].tono} />
        <Typography variant="body2" sx={{ ml: 'auto', color: 'text.secondary' }}>
          {formatearFechaHora(h.detectadoEn)}
        </Typography>
      </Box>
      <Typography sx={{ mt: 0.5 }}>{h.situacion}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Causa probable: {h.causaProbable}
      </Typography>
      <Box component="ul" aria-label="Evidencia" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
        {h.evidencia.map((e, i) => (
          <Typography key={i} component="li" variant="body2" sx={{ color: 'text.secondary' }}>
            {e.herramienta}: {e.dato}
          </Typography>
        ))}
      </Box>
    </Paper>
  );
}

interface PropsSugerencia {
  s: Sugerencia;
}

function SugerenciaItem({ s }: PropsSugerencia) {
  return (
    <Paper component="li" variant="outlined" aria-label={`Sugerencia: ${s.accionTexto}`} sx={{ p: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ fontWeight: 600 }}>{s.accionTexto}</Typography>
        <Typography variant="body2" sx={{ ml: 'auto', color: 'text.secondary' }}>
          {formatearFechaHora(s.creadaEn)}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {s.descripcion}
      </Typography>
    </Paper>
  );
}

const LISTA = { listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1 } as const;

interface Props {
  obraId: string;
}

export function ControlMaterialesPanel({ obraId }: Props) {
  const consulta = useControlMateriales(obraId);
  const datos = consulta.data;

  const contenido = () => {
    if (consulta.sinDatosGuardados) return <AvisoSinConexion consulta={consulta} />;
    if (!datos) return <LinearProgress aria-label="Cargando control de materiales" />;
    return (
      <>
        <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
          Hallazgos
        </Typography>
        {datos.hallazgos.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            El agente no encontró problemas en esta obra.
          </Typography>
        ) : (
          <Box component="ul" aria-label="Hallazgos" sx={{ ...LISTA, mb: 2 }}>
            {datos.hallazgos.map((h, i) => (
              <HallazgoItem key={`${h.ejecucionId}-${i}`} h={h} />
            ))}
          </Box>
        )}
        <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
          Sugerencias pendientes
        </Typography>
        {datos.sugerencias.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No hay sugerencias pendientes.
          </Typography>
        ) : (
          <Box component="ul" aria-label="Sugerencias pendientes" sx={LISTA}>
            {datos.sugerencias.map((s) => (
              <SugerenciaItem key={s.id} s={s} />
            ))}
          </Box>
        )}
      </>
    );
  };

  return (
    <Paper component="section" variant="outlined" aria-label="Control de materiales" sx={{ p: 2, mt: 2 }}>
      <Typography variant="h2" sx={{ mb: 1.5 }}>
        Control de materiales
      </Typography>
      {consulta.desdeEquipo && (
        <Box sx={{ mb: 1 }}>
          <AvisoSinConexion consulta={consulta} />
        </Box>
      )}
      {contenido()}
    </Paper>
  );
}
