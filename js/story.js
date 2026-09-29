'use strict';
// ─── La historia: prólogo, diálogos, combates y fragmentos de memoria ───
// Los nombres de Mira, Suen, Varek, Tharn y Oren son provisionales: cámbialos aquí.
(function () {
  const S = (G.STORY = {});
  const say = G.say, ask = G.ask;

  // ── prólogo ──
  S.prologo = function* () {
    G.R.fade.a = 1;
    G.audio.play('title');
    yield G.narrate([
      'Bajo la superficie, donde la luz nunca llegó, existe el Abismo.',
      'Sus habitantes nacen con marcas que brillan en la piel: el lazo que los une a él.',
      'Por ellas oyen su voz. Por ellas saben quiénes son.',
      'Hasta que un día, la luz tocó el fondo.',
      'Y allí donde tocó, creció un pilar de cuarzo.',
    ], { auto: 330 });
    G.EX.enter('gruta', 6, 11, 'down');
    G.EX.player.lying = true;
    G.EX.frozen = true;
    lie(true);
    yield G.fade(0, 120);
    yield G.wait(60);
    yield say('yo', '...');
    yield say('yo', 'Hace frío. Hay una luz... cayendo desde muy arriba.');
    yield G.wait(30);
    lie(false);
    G.audio.sfx('step');
    yield G.wait(40);
    yield say('yo', 'No recuerdo cómo llegué aquí.');
    yield say('yo', 'No recuerdo nada. Ni siquiera mi nombre.');
    G.EX.frozen = false;
    G.UI.hint('[move]: moverte   [a]: examinar / hablar   [start]: menú', 600);
    yield G.titleCard('Gruta del Despertar');
    G.setFlag('visto_gruta');
  };
  // el protagonista tumbado en el suelo
  function lie(on) {
    const P = G.EX.player;
    if (on) { P.lieSpr = G.SPR.prota_lie; P.bb.set(P.lieSpr); P.frameOverride = P.lieSpr; }
    else P.frameOverride = null;
  }

  S.nada = function* () { yield say(null, '...'); };

  // ── Aldea Nhar ──
  S.llegada_aldea = function* () {
    const M = G.EX.get('mira');
    G.EX.frozen = true;
    yield say('mira', '¡Eh! ¡Espera!');
    M.busy = true;
    yield G.walk('mira', [[6, 14], [4, 14]], 1.2, 'left');
    G.face('prota', 'right');
    yield say('mira', '¡Eres tú! Te encontramos tirado en la gruta hace tres días... y luego desapareciste.');
    yield say('mira', 'Estás... ¿estás bien? Me miras como si no me conocieras.');
    const r = yield ask('prota', '...', ['No recuerdo nada.', '¿Quién eres?']);
    if (r === 0) yield say('mira', '¿Nada? ¿Ni siquiera a mí? Vaya...');
    else yield say('mira', 'Soy Mira. Te traía hongos secos cuando nadie más se acercaba a ti. ¿De verdad no te acuerdas?');
    yield say('mira', 'Mira, no sé cómo decirlo bien. Aquí todos te llaman «el Sin Marca».');
    yield say('mira', 'Todos nacemos con marcas. Brillan cuando el Abismo nos habla.');
    yield say('mira', 'Las tuyas... nunca estuvieron. Por eso la tribu dice que no perteneces aquí.');
    yield say('mira', 'Yo no creo eso. Pero ten cuidado con Varek. Desde que es el líder, las cosas... cambiaron.');
    yield say('mira', 'La anciana Suen quería verte. Está junto al lago, al este.');
    M.home = { x: M.x, z: M.z };
    M.busy = false;
    G.EX.frozen = false;
  };
  S.mira = function* () {
    if (G.flag('oren_libre')) { yield say('mira', 'Tus ojos... ya no parecen perdidos. Me alegro.'); return; }
    if (G.flag('tharn_libre')) { yield say('mira', 'Dicen que Tharn ha vuelto del Claro. Que tiene las marcas otra vez azules. ¿Fuiste tú?'); return; }
    if (G.flag('permiso')) { yield say('mira', '¿Vas al Claro? No mires la luz mucho rato. Los que la miran vuelven... distintos.'); return; }
    yield say('mira', 'La anciana Suen está junto al lago. Varek está arriba, en el altar.');
  };
  S.suen = function* () {
    if (G.flag('suen_hablo')) {
      yield say('suen', 'Oren decía que eras «la puerta que el pilar no puede abrir». Nunca supe qué significaba.');
      return;
    }
    G.setFlag('suen_hablo');
    yield say('suen', 'Así que despertaste.');
    yield say('suen', 'Mis marcas ya casi no oyen al Abismo. Solo oigo un zumbido. Como cristal que canta.');
    const r = yield ask('prota', '...', ['¿Qué es el pilar?', '¿Me conoces?']);
    if (r === 0) {
      yield say('suen', 'Nadie lo sabe. Apareció donde la primera luz tocó el fondo, en el Claro.');
      yield say('suen', 'Alrededor creció una hierba roja que no es de aquí. Y la gente empezó a olvidar cosas... y a recordar otras que nunca pasaron.');
    } else {
      yield say('suen', 'Te conozco como se conoce una sombra que siempre estuvo ahí. Te dejaban a un lado. Yo también, perdóname.');
      yield say('suen', 'Pero Oren no. Oren, el antiguo líder, te buscaba antes de desaparecer.');
    }
    yield say('suen', 'Oren decía que tú eras «la puerta que el pilar no puede abrir».');
    yield say('suen', 'Varek dice que Oren perdió la cabeza y lo desterró. Yo no lo creo.');
    yield say('suen', 'Si quieres respuestas, tendrás que subir al Claro. Y para eso, Varek tiene que dejarte pasar.');
  };
  S.aldeano1 = function* () {
    if (G.flag('tharn_libre')) { yield say('aldeano1', 'Anoche las marcas me picaban. Como si despertaran. Qué raro.'); return; }
    yield say('aldeano1', 'El pilar nos dio luz. Antes solo teníamos hongos y el lago. ¿Por qué tendríamos miedo?');
  };
  S.aldeano2 = function* () {
    yield say('aldeano2', 'Anoche soñé con alguien que no conozco.');
    yield say('aldeano2', 'Y esta mañana... lo recordaba como mi hermano. Recuerdo su risa. Pero yo nunca tuve un hermano. ¿O sí?');
  };
  S.aldeano3 = function* () { yield say('aldeano3', 'No te acerques mucho. Dicen que traes mala suerte... Aunque ahora, con el pilar, ¿quién sabe qué es mala suerte?'); };
  S.guardia = function* () {
    if (G.flag('permiso')) { yield say('guardia', 'Varek ha dado permiso. Pasa... y que la Luz te juzgue.'); return; }
    yield say('guardia', 'Alto. Nadie sube al Claro sin permiso de Varek.');
    yield say('guardia', 'Y menos tú, Sin Marca.');
  };
  S.varek = function* () {
    if (G.flag('permiso')) { yield say('varek', 'Ve. Mira la Luz a los ojos. Ella te dirá lo que eres.'); return; }
    yield say('varek', 'El Sin Marca. El Abismo nunca te habló, y aun así caminas por aquí como si fuera tu casa.');
    yield say('varek', 'El Pilar es la Luz Madre. Nos devuelve lo que perdimos. Nos dice quiénes somos.');
    const r = yield ask('prota', '...', ['¿Qué le pasó a Oren?', 'El pilar os está cambiando.']);
    if (r === 0) {
      yield say('varek', 'Oren temía a la Luz. Quiso romperla. Por eso ya no está.');
      yield say('varek', 'Y preguntaba por ti. Siempre por ti. Como si un vacío pudiera salvarnos de algo.');
    } else {
      yield say('varek', '¿Cambiando? Nos está completando. Tú no lo entenderías: no hay nada en ti que completar.');
    }
    yield say('varek', '¿Quieres ver el Claro? Ve. Mira la Luz a los ojos... y verás que no eres nada.');
    G.setFlag('permiso');
    const gd = G.EX.get('guardia');
    yield say('guardia', '¡Sí, Varek!');
    yield G.walk('guardia', [[21, 8]], 0.8, 'left');
    gd.home = { x: gd.x, z: gd.z };
    G.UI.toast('El camino al norte está abierto');
  };

  // ── plantas-alma (guardado) ──
  S.planta = (p) => function* () {
    const def = p.def;
    if (!def) { yield say(null, 'Una planta extraña. Parece dormida.'); return; }
    const first = !G.save.plants.includes(def.id);
    if (first) {
      yield say(null, 'Una planta que late con una luz tenue.');
      yield say(null, 'Dentro, algo pequeño y cálido... como un fragmento de alma, dormido.');
      yield say(null, 'Al tocarla, la luz despierta.');
      G.save.plants.push(def.id);
      G.lightPlant(p);
      yield G.wait(40);
      G.UI.toast('Planta-alma despertada (' + G.save.plants.length + '/10)', '#9affe8');
    } else yield say(null, 'La planta-alma late con calma. Una parte de alguien descansa aquí.');
    const r = yield ask(null, '¿Guardar tu camino aquí?', ['Guardar', 'No']);
    if (r === 0) {
      G.writeSave(def);
      G.audio.sfx('save');
      G.EX.player.hp = 5;
      yield say(null, 'Tu camino ha quedado guardado en la planta de ' + def.name + '.');
    }
  };

  // ── Senda de las Raíces ──
  S.senda_roja = function* () {
    yield say('yo', 'Esta hierba roja... Sé que no crecía aquí. No sé cómo lo sé.');
    yield say('yo', 'Y el aire zumba. Como cristal que canta.');
  };
  S.perdido = function* () {
    yield say('perdido', 'La Luz me enseñó quién era... Tenía una casa junto al lago... ¿O era junto al Claro?');
    yield say('perdido', 'Ya no me acuerdo de antes. Pero no importa. La Luz lo recuerda por mí.');
  };
  S.tharn = function* () {
    G.EX.frozen = true;
    const P = G.EX.player;
    yield G.camTo(P.x, P.z - 120, 70);
    yield G.wait(30);
    yield say('tharn', 'Sin... Marca...');
    yield say('tharn', 'Yo protegía... la entrada. ¿A quién? ¿De quién?');
    yield say('tharn', 'La Luz dice que tú... no perteneces. Que debo... apartarte.');
    yield G.camBack(40);
    const r = yield ask('prota', '...', ['No quiero hacerte daño.', 'Apártate.']);
    if (r === 0) yield say('tharn', 'Daño... Ya no siento... nada que dañar.');
    else yield say('tharn', 'No puedo... La Luz no me deja.');
    const res = yield G.combat('tharn');
    void res;
    G.setFlag('tharn_libre');
    G.EX.enter('senda', 15, 14, 'up');
    G.EX.frozen = true;
    yield G.fade(0, 40);
    yield say('tharn_libre', '...Lo recuerdo. Soy Tharn. Protegía el paso al Santuario... junto a Oren.');
    yield say('tharn_libre', 'Mis marcas... vuelven a oír al Abismo. Es débil, pero es su voz. No la del pilar.');
    yield say('tharn_libre', 'Oren descubrió algo sobre ti. Dijo que podías liberarnos. Varek lo llamó traidor.');
    yield say('tharn_libre', 'Y la Luz se lo llevó al Santuario Hundido, al este. Si queda algo de él, está allí.');
    yield say('tharn_libre', 'Ve. Antes de que no quede nada.');
    G.EX.frozen = false;
  };
  S.tharn_libre = function* () { yield say('tharn_libre', 'El Santuario está al este. Yo vigilaré el Claro. Esta vez, de verdad.'); };

  // ── Santuario Hundido ──
  S.alma = function* () {
    G.EX.frozen = true;
    yield say('alma', '...Tú. El que no escucha.');
    yield say('alma', 'Y por eso... el que no puede ser mandado.');
    yield say('alma', 'Las almas que guardaban este mundo se apagaron una a una cuando llegó la luz. Yo soy lo último que queda de ellas.');
    yield say('alma', 'Toma lo que nos queda. Vas a necesitarlo para lo que te espera al fondo.');
    G.audio.sfx('ser');
    yield G.flashFx([1, 1, 1], 60, 0.9);
    for (const k of ['alma', 'ser']) if (!G.save.skills.includes(k)) G.save.skills.push(k);
    G.UI.toast('Has despertado Alma y Ser', '#c8a0ff');
    const a = G.EX.get('alma');
    if (a) { G.fxBurst(a.x, 20, a.z, '#e8f0ff', 60); a.remove(); G.EX.actors.splice(G.EX.actors.indexOf(a), 1); }
    yield G.wait(60);
    yield say('yo', 'Cinco palabras, ahora. Mente. Recuerdos. Cuerpo. Alma. Ser.');
    G.EX.frozen = false;
  };
  S.oren = function* () {
    G.EX.frozen = true;
    yield say('oren', '...Te... esperaba.');
    yield say('oren', 'No. No te acerques. Ella usa lo que recuerdo... para hablar por mí.');
    yield say('oren', 'Mi cuerpo ya no responde a los golpes. Si quieres llegar a mí... tendrás que usar todo lo que eres.');
    const r = yield ask('prota', '...', ['Voy a liberarte.', '¿Quién soy yo?']);
    if (r === 1) yield say('oren', 'Esa pregunta... la guardé para ti. Está debajo del cuarzo. Ven a buscarla.');
    else yield say('oren', 'Entonces... no te detengas. Aunque te suplique.');
    yield G.combat('oren');
    G.setFlag('oren_libre');
    G.EX.enter('santuario', 13, 9, 'up');
    G.EX.frozen = true;
    yield G.fade(0, 60);
    yield* S.final();
  };
  S.oren_libre = function* () { yield say('oren_libre', 'El Abismo ya no depende de mí. Depende de ti.'); };

  // ── fragmentos de memoria (se reciben al romper cada sello de Oren) ──
  S.FRAGS = [
    { title: 'I · La orilla', lines: [
      'Un niño sin marcas, sentado solo a la orilla del lago Nhar.',
      'Los demás juegan lejos. Sus marcas brillan cuando se ríen.',
      'Una mano grande se posa en su hombro. «¿Te dejan fuera otra vez?», dice Oren.',
    ] },
    { title: 'II · Los murales', lines: [
      'Oren, de noche, frente a los murales del Santuario, con una lámpara.',
      '«Las marcas nos unen al Abismo. Por ellas lo oímos.»',
      '«Pero un lazo sirve para las dos cosas: para oír... y para que tiren de ti.»',
    ] },
    { title: 'III · La primera luz', lines: [
      'La luz toca el fondo. El pilar crece en una sola noche.',
      'Uno a uno, los marcados se giran hacia él, como si alguien dijera su nombre.',
      'Tú no oyes nada. Solo ves cómo todos miran hacia el mismo sitio.',
    ] },
    { title: 'IV · El intento', lines: [
      'Oren frente al pilar, golpeándolo con su bastón hasta que se astilla.',
      'Sus marcas se vuelven rojas, línea a línea, como sangre que sube.',
      '«¡Varek, llévatelo! ¡Protege al chico!» Varek no se mueve. Sonríe.',
    ] },
    { title: 'V · Lo que no pudo decir', lines: [
      'Oren, antes de perderse, escribiendo en la pared con la mano temblando.',
      '«Algún día te dirán que no perteneces aquí.»',
      '«No les creas. Tal vez el Abismo solo necesitaba a alguien que no pudiera ser mandado.»',
    ] },
  ];
  function* fragment(i) {
    if (!G.save.frags.includes(i)) G.save.frags.push(i);
    G.audio.sfx('fragment');
    const song = G.audio.song;
    G.audio.play('recuerdo');
    yield G.memory('Fragmento de memoria ' + (i + 1) + '/5', S.FRAGS[i].lines);
    G.UI.toast('Fragmento recuperado: ' + S.FRAGS[i].title, '#ffd070');
    G.audio.play(song);
  }

  // ── escenas dentro de los combates ──
  S.tutorial_combate = function* () {
    yield say('yo', 'Hay algo pegado a él. Como sellos de cristal sobre su mente y su cuerpo.');
    yield say(null, G.keys('[a]: golpe (aturde si llenas su Resistencia)   [x]: esquivar (eres intocable mientras ruedas)'));
    yield say(null, G.keys('Las habilidades rompen los sellos: [s] (o [y] para usar la que pide el sello actual).'));
    yield say(null, 'Cada sello solo cede ante una habilidad. Si está aturdido, cede antes.');
  };
  S.cb_tharn = (phase, last) => (function* () {
    if (!last) {
      yield say('tharn', '¿Por qué... mi cabeza... está en silencio?');
      yield say('tharn', 'La Luz... ya no grita. Pero ahora oigo... otra cosa. Recuerdos. Me duelen.');
      const r = yield ask('prota', '...', ['Recuerda quién eras.', 'Lucha contra ella.']);
      if (r === 0) yield say('tharn', 'Quién era... Había una puerta... y alguien a mi lado...');
      else yield say('tharn', 'Luchar... ¿contra la Luz? No sé... si sé hacerlo.');
      yield say('yo', 'Algo se abre dentro de mí. Una palabra antigua.');
      if (!G.save.skills.includes('recuerdos')) G.save.skills.push('recuerdos');
      G.audio.sfx('recuerdos');
      G.UI.toast('Has despertado Recuerdos', '#ffd070');
    } else {
      yield say('tharn', 'Ya... no pesa...');
    }
  })();
  S.cb_oren = (phase, last) => (function* () {
    yield* fragment(phase);
    const lines = [
      ['oren', '...Aquella orilla. Tú eras tan pequeño.'],
      ['oren', 'Los murales... lo supe allí. Demasiado tarde.'],
      ['oren', 'Mi cuerpo... vuelve a ser mío. Casi.'],
      ['oren', 'Mi alma... todavía está aquí. Gracias a ti.'],
      ['oren', '...'],
    ];
    yield say(...lines[phase]);
  })();
  S.derrota = function* (id) {
    yield G.fade(1, 40);
    yield say('yo', id === 'oren' ? 'Otra vez. No voy a dejarte ahí dentro.' : 'Todavía no. Otra vez.');
    yield G.fade(0, 40);
  };

  // ── final del prólogo: la verdad de Oren ──
  S.final = function* () {
    yield say('oren_libre', '...Por fin. Mi voz. Es mi voz.');
    yield say('oren_libre', 'Escúchame bien, porque no sé cuánto me durará la cabeza.');
    yield say('oren_libre', 'Antes de que el pilar lo tomara todo, descubrí por qué la tribu te apartó.');
    yield say('oren_libre', 'No tener marcas significaba que no tenías el lazo que los demás tenemos con el Abismo. Todos lo vieron como una debilidad. Como la prueba de que no pertenecías aquí.');
    yield say('oren_libre', 'Pero el pilar entra por ese lazo. Tira de él. Por eso nos manda a todos.');
    yield say('oren_libre', 'Y a ti... no tiene de dónde tirar.');
    const r = yield ask('prota', '...', ['Por eso resisto.', 'Entonces, ¿qué soy?']);
    if (r === 0) yield say('oren_libre', 'Por eso. Lo que te quitaron es lo único que el pilar no puede quitarte.');
    else yield say('oren_libre', 'Eso no lo sé. Nadie lo sabe. Pero no eres un error. Eso sí lo sé.');
    yield say('oren_libre', 'Lo descubrí demasiado tarde. Intenté detenerlo, proteger a todos... y el cuarzo me alcanzó.');
    yield say('oren_libre', 'Varek se arrodilló ante él. Y yo me perdí, poco a poco, recordando cosas que no eran mías.');
    yield say('oren_libre', 'Ahora eres el único que puede recorrer el Abismo sin que la Luz le hable por dentro.');
    yield say('oren_libre', 'Te lo confío. Libera a los que puedas. Y averigua lo que yo no pude.');
    yield say('oren_libre', 'Eres la última esperanza del Abismo.');
    G.setFlag('nombre_sabido');
    yield G.wait(30);
    yield say('yo', 'Toda la vida me dijeron que no pertenecía aquí.');
    yield say('yo', '¿Y si el problema nunca fue que yo estuviera fuera de lugar?');
    // el progreso queda guardado en la última planta-alma que usaste (solo se guarda en ellas)
    G.meta.ended = true;
    const lp = G.PLANTS.find((p) => p.id === G.save.plant);
    if (lp) G.writeSave(lp); else G.writeMeta();
    yield G.fade(1, 90);
    G.audio.play('title');
    yield G.narrate(['Fin del prólogo', 'Plantas-alma despertadas: ' + G.save.plants.length + ' de 10.  Fragmentos de memoria: ' + G.save.frags.length + ' de 5.', 'A partir de ahora puedes volver a cualquier planta-alma que hayas despertado desde el título.', 'Gracias por jugar.']);
    G.toTitle();
  };

  // ── combate como tarea de una escena ──
  G.combat = (id) => {
    let done = false, phase = 0;
    return {
      value: 'win',
      update() {
        if (phase === 0) {
          phase = 1;
          // transición: destello, la imagen se parte y pasa al plano lateral
          G.audio.sfx('boom');
          G.R.flash.r = 1; G.R.flash.g = 0.3; G.R.flash.b = 0.4; G.R.flash.a = 0.9;
          this.t = 0;
        }
        if (phase === 1) {
          this.t++;
          G.R.fade.r = 0; G.R.fade.g = 0; G.R.fade.b = 0;
          G.R.fade.a = Math.min(1, this.t / 30);
          G.R.flash.a *= 0.9;
          if (this.t >= 34) {
            phase = 2;
            G.mode = 'combat';
            G.CB.start(id, () => { done = true; });
            this.t = 0;
          }
          return false;
        }
        if (phase === 2) {
          this.t++;
          if (this.t < 30) G.R.fade.a = 1 - this.t / 30; else G.R.fade.a = 0;
          if (done) { phase = 3; this.t = 0; }
          return false;
        }
        if (phase === 3) {
          this.t++;
          G.R.fade.a = Math.min(1, this.t / 40);
          if (this.t >= 44) { G.mode = 'explore'; return true; }
          return false;
        }
        return false;
      },
    };
  };
})();
