export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      actas: {
        Row: {
          capturada_en: string
          creada_por: string
          dignidad: string
          distancia_recinto_m: number
          fuera_margen: boolean
          id: string
          mesa_id: string
          estado_revision: string
          motivo_revision: string | null
          revisada_por: string | null
          revisada_en: string | null
          recibida_en: string
          total_sufragantes: number
          votos_blancos: number
          votos_nulos: number
        }
        Insert: {
          capturada_en: string
          creada_por: string
          dignidad: string
          distancia_recinto_m: number
          fuera_margen?: boolean
          id: string
          mesa_id: string
          estado_revision?: string
          motivo_revision?: string | null
          revisada_por?: string | null
          revisada_en?: string | null
          recibida_en?: string
          total_sufragantes: number
          votos_blancos: number
          votos_nulos: number
        }
        Update: {
          capturada_en?: string
          creada_por?: string
          dignidad?: string
          distancia_recinto_m?: number
          fuera_margen?: boolean
          id?: string
          mesa_id?: string
          estado_revision?: string
          motivo_revision?: string | null
          revisada_por?: string | null
          revisada_en?: string | null
          recibida_en?: string
          total_sufragantes?: number
          votos_blancos?: number
          votos_nulos?: number
        }
        Relationships: [
          {
            foreignKeyName: "actas_creada_por_fkey"
            columns: ["creada_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actas_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actas_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "vw_exportacion_actas"
            referencedColumns: ["mesa_id"]
          },
          {
            foreignKeyName: "actas_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "vw_progreso_mesas"
            referencedColumns: ["mesa_id"]
          },
        ]
      }
      asignaciones_veedor: {
        Row: {
          asignado_en: string
          asignado_por: string
          finalizado_en: string | null
          finalizado_por: string | null
          id: string
          mesa_id: string
          rol_veedor: string
          veedor_id: string
        }
        Insert: {
          asignado_en?: string
          asignado_por: string
          finalizado_en?: string | null
          finalizado_por?: string | null
          id?: string
          mesa_id: string
          rol_veedor?: string
          veedor_id: string
        }
        Update: {
          asignado_en?: string
          asignado_por?: string
          finalizado_en?: string | null
          finalizado_por?: string | null
          id?: string
          mesa_id?: string
          rol_veedor?: string
          veedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_veedor_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_veedor_finalizado_por_fkey"
            columns: ["finalizado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_veedor_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_veedor_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "vw_exportacion_actas"
            referencedColumns: ["mesa_id"]
          },
          {
            foreignKeyName: "asignaciones_veedor_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "vw_progreso_mesas"
            referencedColumns: ["mesa_id"]
          },
          {
            foreignKeyName: "asignaciones_veedor_veedor_id_fkey"
            columns: ["veedor_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_veedor_veedor_id_rol_veedor_fkey"
            columns: ["veedor_id", "rol_veedor"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id", "rol"]
          },
        ]
      }
      candidatos: {
        Row: {
          dignidad: string
          id: string
          nombre: string
          organizacion_id: string
        }
        Insert: {
          dignidad: string
          id?: string
          nombre: string
          organizacion_id: string
        }
        Update: {
          dignidad?: string
          id?: string
          nombre?: string
          organizacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "vw_resultados_preliminares"
            referencedColumns: ["organizacion_id"]
          },
        ]
      }
      cantones: {
        Row: {
          id: string
          nombre: string
          provincia_id: string
        }
        Insert: {
          id?: string
          nombre: string
          provincia_id: string
        }
        Update: {
          id?: string
          nombre?: string
          provincia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cantones_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "provincias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantones_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "vw_exportacion_actas"
            referencedColumns: ["provincia_id"]
          },
          {
            foreignKeyName: "cantones_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "vw_progreso_mesas"
            referencedColumns: ["provincia_id"]
          },
          {
            foreignKeyName: "cantones_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "vw_resultados_preliminares"
            referencedColumns: ["provincia_id"]
          },
        ]
      }
      configuracion: {
        Row: {
          margen_ubicacion_m: number
          unica: boolean
        }
        Insert: {
          margen_ubicacion_m?: number
          unica?: boolean
        }
        Update: {
          margen_ubicacion_m?: number
          unica?: boolean
        }
        Relationships: []
      }
      evidencias: {
        Row: {
          acta_id: string
          capturada_en: string
          id: string
          latitud: number
          longitud: number
          precision_m: number
          recibida_en: string
          ruta_foto: string
        }
        Insert: {
          acta_id: string
          capturada_en: string
          id?: string
          latitud: number
          longitud: number
          precision_m: number
          recibida_en?: string
          ruta_foto: string
        }
        Update: {
          acta_id?: string
          capturada_en?: string
          id?: string
          latitud?: number
          longitud?: number
          precision_m?: number
          recibida_en?: string
          ruta_foto?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidencias_acta_id_fkey"
            columns: ["acta_id"]
            isOneToOne: false
            referencedRelation: "actas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidencias_acta_id_fkey"
            columns: ["acta_id"]
            isOneToOne: false
            referencedRelation: "vw_exportacion_actas"
            referencedColumns: ["acta_id"]
          },
        ]
      }
      historial_actas: {
        Row: {
          acta_id: string
          actor_cedula: string
          actor_id: string
          entidad: string
          id: number
          mesa_id: string
          recinto_id: string
          registrada_en: string
          transaccion_id: number
          valores_anteriores: Json
          valores_nuevos: Json
        }
        Insert: {
          acta_id: string
          actor_cedula: string
          actor_id: string
          entidad: string
          id?: never
          mesa_id: string
          recinto_id: string
          registrada_en?: string
          transaccion_id?: number
          valores_anteriores: Json
          valores_nuevos: Json
        }
        Update: {
          acta_id?: string
          actor_cedula?: string
          actor_id?: string
          entidad?: string
          id?: never
          mesa_id?: string
          recinto_id?: string
          registrada_en?: string
          transaccion_id?: number
          valores_anteriores?: Json
          valores_nuevos?: Json
        }
        Relationships: [
          {
            foreignKeyName: "historial_actas_acta_id_fkey"
            columns: ["acta_id"]
            isOneToOne: false
            referencedRelation: "actas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_actas_acta_id_fkey"
            columns: ["acta_id"]
            isOneToOne: false
            referencedRelation: "vw_exportacion_actas"
            referencedColumns: ["acta_id"]
          },
          {
            foreignKeyName: "historial_actas_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_actas_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_actas_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "vw_exportacion_actas"
            referencedColumns: ["mesa_id"]
          },
          {
            foreignKeyName: "historial_actas_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "vw_progreso_mesas"
            referencedColumns: ["mesa_id"]
          },
          {
            foreignKeyName: "historial_actas_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "recintos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_actas_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "vw_exportacion_actas"
            referencedColumns: ["recinto_id"]
          },
          {
            foreignKeyName: "historial_actas_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "vw_progreso_mesas"
            referencedColumns: ["recinto_id"]
          },
          {
            foreignKeyName: "historial_actas_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "vw_resultados_preliminares"
            referencedColumns: ["recinto_id"]
          },
        ]
      }
      historial_revision_actas: {
        Row: {
          acta_id: string
          actor_cedula: string
          actor_id: string
          estado_revision: string
          id: number
          motivo: string | null
          registrada_en: string
        }
        Insert: {
          acta_id: string
          actor_cedula: string
          actor_id: string
          estado_revision: string
          id?: never
          motivo?: string | null
          registrada_en?: string
        }
        Update: {
          acta_id?: string
          actor_cedula?: string
          actor_id?: string
          estado_revision?: string
          id?: never
          motivo?: string | null
          registrada_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "historial_revision_actas_acta_id_fkey"
            columns: ["acta_id"]
            isOneToOne: false
            referencedRelation: "actas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_revision_actas_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mesas: {
        Row: {
          id: string
          numero: number
          recinto_id: string
        }
        Insert: {
          id?: string
          numero: number
          recinto_id: string
        }
        Update: {
          id?: string
          numero?: number
          recinto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mesas_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "recintos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mesas_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "vw_exportacion_actas"
            referencedColumns: ["recinto_id"]
          },
          {
            foreignKeyName: "mesas_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "vw_progreso_mesas"
            referencedColumns: ["recinto_id"]
          },
          {
            foreignKeyName: "mesas_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "vw_resultados_preliminares"
            referencedColumns: ["recinto_id"]
          },
        ]
      }
      organizaciones: {
        Row: {
          color_hex: string
          id: string
          nombre: string
          orden: number
          sigla: string
        }
        Insert: {
          color_hex: string
          id?: string
          nombre: string
          orden: number
          sigla: string
        }
        Update: {
          color_hex?: string
          id?: string
          nombre?: string
          orden?: number
          sigla?: string
        }
        Relationships: []
      }
      parroquias: {
        Row: {
          canton_id: string
          id: string
          nombre: string
          provincia_id: string
        }
        Insert: {
          canton_id: string
          id?: string
          nombre: string
          provincia_id: string
        }
        Update: {
          canton_id?: string
          id?: string
          nombre?: string
          provincia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parroquias_canton_id_provincia_id_fkey"
            columns: ["canton_id", "provincia_id"]
            isOneToOne: false
            referencedRelation: "cantones"
            referencedColumns: ["id", "provincia_id"]
          },
        ]
      }
      perfiles: {
        Row: {
          apellidos: string
          cedula: string
          correo: string
          creado_en: string
          creado_por: string | null
          debe_cambiar_clave: boolean
          id: string
          nombres: string
          provincia_id: string
          rol: string
          telefono: string
        }
        Insert: {
          apellidos: string
          cedula: string
          correo: string
          creado_en?: string
          creado_por?: string | null
          debe_cambiar_clave?: boolean
          id: string
          nombres: string
          provincia_id: string
          rol: string
          telefono: string
        }
        Update: {
          apellidos?: string
          cedula?: string
          correo?: string
          creado_en?: string
          creado_por?: string | null
          debe_cambiar_clave?: boolean
          id?: string
          nombres?: string
          provincia_id?: string
          rol?: string
          telefono?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_creado_por_provincia_id_fkey"
            columns: ["creado_por", "provincia_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id", "provincia_id"]
          },
          {
            foreignKeyName: "perfiles_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "provincias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfiles_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "vw_exportacion_actas"
            referencedColumns: ["provincia_id"]
          },
          {
            foreignKeyName: "perfiles_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "vw_progreso_mesas"
            referencedColumns: ["provincia_id"]
          },
          {
            foreignKeyName: "perfiles_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "vw_resultados_preliminares"
            referencedColumns: ["provincia_id"]
          },
        ]
      }
      provincias: {
        Row: {
          id: string
          nombre: string
        }
        Insert: {
          id?: string
          nombre: string
        }
        Update: {
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      recintos: {
        Row: {
          canton_id: string
          coordinador_id: string | null
          creado_en: string
          id: string
          latitud: number
          longitud: number
          nombre: string
          parroquia_id: string
          provincia_id: string
          rol_coordinador: string
        }
        Insert: {
          canton_id: string
          coordinador_id?: string | null
          creado_en?: string
          id?: string
          latitud: number
          longitud: number
          nombre: string
          parroquia_id: string
          provincia_id: string
          rol_coordinador?: string
        }
        Update: {
          canton_id?: string
          coordinador_id?: string | null
          creado_en?: string
          id?: string
          latitud?: number
          longitud?: number
          nombre?: string
          parroquia_id?: string
          provincia_id?: string
          rol_coordinador?: string
        }
        Relationships: [
          {
            foreignKeyName: "recintos_canton_id_provincia_id_fkey"
            columns: ["canton_id", "provincia_id"]
            isOneToOne: false
            referencedRelation: "cantones"
            referencedColumns: ["id", "provincia_id"]
          },
          {
            foreignKeyName: "recintos_coordinador_id_provincia_id_fkey"
            columns: ["coordinador_id", "provincia_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id", "provincia_id"]
          },
          {
            foreignKeyName: "recintos_coordinador_id_rol_coordinador_provincia_id_fkey"
            columns: ["coordinador_id", "rol_coordinador", "provincia_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id", "rol", "provincia_id"]
          },
          {
            foreignKeyName: "recintos_parroquia_id_provincia_id_canton_id_fkey"
            columns: ["parroquia_id", "provincia_id", "canton_id"]
            isOneToOne: false
            referencedRelation: "parroquias"
            referencedColumns: ["id", "provincia_id", "canton_id"]
          },
        ]
      }
      reemplazos_veedor: {
        Row: {
          asignacion_anterior_id: string
          asignacion_nueva_id: string
          id: string
          mesa_id: string
          motivo: string
          reemplazado_en: string
          reemplazado_por: string
          veedor_entrante_id: string
          veedor_saliente_id: string
        }
        Insert: {
          asignacion_anterior_id: string
          asignacion_nueva_id: string
          id?: string
          mesa_id: string
          motivo: string
          reemplazado_en?: string
          reemplazado_por: string
          veedor_entrante_id: string
          veedor_saliente_id: string
        }
        Update: {
          asignacion_anterior_id?: string
          asignacion_nueva_id?: string
          id?: string
          mesa_id?: string
          motivo?: string
          reemplazado_en?: string
          reemplazado_por?: string
          veedor_entrante_id?: string
          veedor_saliente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reemplazos_veedor_asignacion_anterior_id_mesa_id_veedor_sa_fkey"
            columns: ["asignacion_anterior_id", "mesa_id", "veedor_saliente_id"]
            isOneToOne: false
            referencedRelation: "asignaciones_veedor"
            referencedColumns: ["id", "mesa_id", "veedor_id"]
          },
          {
            foreignKeyName: "reemplazos_veedor_asignacion_nueva_id_mesa_id_veedor_entra_fkey"
            columns: ["asignacion_nueva_id", "mesa_id", "veedor_entrante_id"]
            isOneToOne: false
            referencedRelation: "asignaciones_veedor"
            referencedColumns: ["id", "mesa_id", "veedor_id"]
          },
          {
            foreignKeyName: "reemplazos_veedor_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reemplazos_veedor_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "vw_exportacion_actas"
            referencedColumns: ["mesa_id"]
          },
          {
            foreignKeyName: "reemplazos_veedor_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "vw_progreso_mesas"
            referencedColumns: ["mesa_id"]
          },
          {
            foreignKeyName: "reemplazos_veedor_reemplazado_por_fkey"
            columns: ["reemplazado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reemplazos_veedor_veedor_entrante_id_fkey"
            columns: ["veedor_entrante_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reemplazos_veedor_veedor_saliente_id_fkey"
            columns: ["veedor_saliente_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      votos_por_organizacion: {
        Row: {
          acta_id: string
          organizacion_id: string
          votos: number
        }
        Insert: {
          acta_id: string
          organizacion_id: string
          votos: number
        }
        Update: {
          acta_id?: string
          organizacion_id?: string
          votos?: number
        }
        Relationships: [
          {
            foreignKeyName: "votos_por_organizacion_acta_id_fkey"
            columns: ["acta_id"]
            isOneToOne: false
            referencedRelation: "actas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votos_por_organizacion_acta_id_fkey"
            columns: ["acta_id"]
            isOneToOne: false
            referencedRelation: "vw_exportacion_actas"
            referencedColumns: ["acta_id"]
          },
          {
            foreignKeyName: "votos_por_organizacion_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votos_por_organizacion_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "vw_resultados_preliminares"
            referencedColumns: ["organizacion_id"]
          },
        ]
      }
    }
    Views: {
      vw_exportacion_actas: {
        Row: {
          acta_id: string | null
          canton: string | null
          canton_id: string | null
          capturada_en: string | null
          dignidad: string | null
          distancia_recinto_m: number | null
          evidencia_capturada_en: string | null
          evidencia_id: string | null
          evidencia_latitud: number | null
          evidencia_longitud: number | null
          evidencia_precision_m: number | null
          evidencia_recibida_en: string | null
          fuera_margen: boolean | null
          mesa_id: string | null
          mesa_numero: number | null
          parroquia: string | null
          parroquia_id: string | null
          provincia: string | null
          provincia_id: string | null
          recibida_en: string | null
          recinto: string | null
          recinto_id: string | null
          ruta_foto_evidencia: string | null
          total_sufragantes: number | null
          veedor_apellidos: string | null
          veedor_cedula: string | null
          veedor_nombres: string | null
          votos_arp: number | null
          votos_blancos: number | null
          votos_fdp: number | null
          votos_mfc: number | null
          votos_mne: number | null
          votos_muc: number | null
          votos_nulos: number | null
        }
        Relationships: []
      }
      vw_progreso_mesas: {
        Row: {
          acta_registrada: boolean | null
          canton: string | null
          canton_id: string | null
          dignidad: string | null
          distancia_recinto_m: number | null
          fuera_margen: boolean | null
          mesa_id: string | null
          mesa_numero: number | null
          parroquia: string | null
          parroquia_id: string | null
          pendiente: boolean | null
          provincia: string | null
          provincia_id: string | null
          recinto: string | null
          recinto_id: string | null
        }
        Relationships: []
      }
      vw_resultados_preliminares: {
        Row: {
          candidato: string | null
          candidato_id: string | null
          canton: string | null
          canton_id: string | null
          dignidad: string | null
          nivel_territorial: string | null
          organizacion: string | null
          organizacion_id: string | null
          organizacion_sigla: string | null
          parroquia: string | null
          parroquia_id: string | null
          porcentaje_sufragantes: number | null
          porcentaje_votos_validos: number | null
          provincia: string | null
          provincia_id: string | null
          recinto: string | null
          recinto_id: string | null
          total_sufragantes: number | null
          total_votos_validos: number | null
          votos_blancos: number | null
          votos_nulos: number | null
          votos_validos_organizacion: number | null
        }
        Relationships: []
      }
      vw_actas_revision: {
        Row: {
          acta_id: string | null
          capturada_en: string | null
          coordinador_id: string | null
          distancia_recinto_m: number | null
          dignidad: string | null
          evidencia_capturada_en: string | null
          evidencia_latitud: number | null
          evidencia_longitud: number | null
          evidencia_precision_m: number | null
          estado_revision: string | null
          fuera_margen: boolean | null
          mesa_id: string | null
          mesa_numero: number | null
          motivo_revision: string | null
          parroquia: string | null
          parroquia_id: string | null
          provincia_id: string | null
          recibida_en: string | null
          recinto: string | null
          recinto_id: string | null
          ruta_foto: string | null
          total_sufragantes: number | null
          veedor_apellidos: string | null
          veedor_id: string | null
          veedor_nombres: string | null
          votos_blancos: number | null
          votos_nulos: number | null
        }
        Relationships: []
      }
      vw_avance_revision_recintos: {
        Row: {
          actas_esperadas: number | null
          actas_recibidas: number | null
          actas_rechazadas: number | null
          actas_validadas: number | null
          alertas_geovalla: number | null
          mesas_esperadas: number | null
          mesas_reportadas: number | null
          mesas_validadas: number | null
          parroquia: string | null
          parroquia_id: string | null
          provincia_id: string | null
          recinto: string | null
          recinto_id: string | null
        }
        Relationships: []
      }
      vw_detalle_votos_revision: {
        Row: {
          acta_id: string | null
          candidato: string | null
          candidato_id: string | null
          color_hex: string | null
          organizacion: string | null
          organizacion_id: string | null
          organizacion_orden: number | null
          organizacion_sigla: string | null
          votos: number | null
        }
        Relationships: []
      }
      vw_historial_revision_actas: {
        Row: {
          acta_id: string | null
          actor_apellidos: string | null
          actor_cedula: string | null
          actor_nombres: string | null
          estado_revision: string | null
          id: number | null
          motivo: string | null
          registrada_en: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      acta_registro_coincide: {
        Args: {
          p_acta_id: string
          p_actor: string
          p_capturada_en: string
          p_dignidad: string
          p_evidencia: Json
          p_mesa_id: string
          p_total_sufragantes: number
          p_votos: Json
          p_votos_blancos: number
          p_votos_nulos: number
        }
        Returns: boolean
      }
      correccion_acta_coincide: {
        Args: {
          p_acta_id: string
          p_evidencia: Json
          p_total_sufragantes: number
          p_votos: Json
          p_votos_blancos: number
          p_votos_nulos: number
        }
        Returns: boolean
      }
      corregir_acta: {
        Args: {
          p_acta_id: string
          p_evidencia?: Json
          p_motivo: string
          p_total_sufragantes: number
          p_votos: Json
          p_votos_blancos: number
          p_votos_nulos: number
        }
        Returns: string
      }
      insertar_evidencia_acta: {
        Args: { p_acta_id: string; p_evidencia: Json }
        Returns: undefined
      }
      crear_recinto_con_mesas: {
        Args: {
          p_cantidad_mesas: number
          p_canton_id: string
          p_coordinador_id?: string | null
          p_latitud: number
          p_longitud: number
          p_nombre: string
          p_parroquia_id: string
          p_provincia_id: string
        }
        Returns: string
      }
      reemplazar_veedor: {
        Args: {
          p_asignacion_anterior_id: string
          p_motivo: string
          p_veedor_entrante_id: string
        }
        Returns: string
      }
      registrar_acta: {
        Args: {
          p_acta_id: string
          p_capturada_en: string
          p_dignidad: string
          p_evidencia: Json
          p_mesa_id: string
          p_total_sufragantes: number
          p_votos: Json
          p_votos_blancos: number
          p_votos_nulos: number
        }
        Returns: string
      }
      revisar_acta: {
        Args: {
          p_acta_id: string
          p_estado_revision: string
          p_motivo?: string | null
        }
        Returns: string
      }
      recapturar_acta_rechazada: {
        Args: {
          p_acta_id: string
          p_evidencia: Json
          p_total_sufragantes: number
          p_votos: Json
          p_votos_blancos: number
          p_votos_nulos: number
        }
        Returns: string
      }
      rls_provincia_actual: { Args: never; Returns: string }
      rls_puede_gestionar_mesa: {
        Args: { p_mesa_id: string }
        Returns: boolean
      }
      rls_puede_gestionar_provincia: {
        Args: { p_provincia_id: string }
        Returns: boolean
      }
      rls_puede_gestionar_recinto: {
        Args: { p_recinto_id: string }
        Returns: boolean
      }
      rls_puede_ver_acta: { Args: { p_acta_id: string }; Returns: boolean }
      rls_puede_ver_asignacion: {
        Args: { p_asignacion_id: string }
        Returns: boolean
      }
      rls_puede_ver_canton: { Args: { p_canton_id: string }; Returns: boolean }
      rls_puede_ver_mesa: { Args: { p_mesa_id: string }; Returns: boolean }
      rls_puede_ver_parroquia: {
        Args: { p_parroquia_id: string }
        Returns: boolean
      }
      rls_puede_ver_perfil: { Args: { p_perfil_id: string }; Returns: boolean }
      rls_puede_ver_recinto: {
        Args: { p_recinto_id: string }
        Returns: boolean
      }
      rls_puede_ver_reemplazo: {
        Args: { p_reemplazo_id: string }
        Returns: boolean
      }
      validar_catalogo_organizaciones_s02: { Args: never; Returns: undefined }
      validar_cedula_ecuatoriana: {
        Args: { p_cedula: string }
        Returns: boolean
      }
      validar_evidencia_json: {
        Args: { p_evidencia: Json }
        Returns: undefined
      }
      validar_lista_votos: { Args: { p_votos: Json }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
