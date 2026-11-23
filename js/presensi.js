window.Presensi={
  tab:'input', barChart:null, donutChart:null,
  render(){const app=document.getElementById('app');app.innerHTML=`<div class="mx-auto max-w-[1280px]"><div class="mb-5"><p class="text-xs uppercase tracking-widest text-sage">Kehadiran Umat</p><h1 class="mt-1 text-2xl font-semibold">Presensi Pengajian</h1></div><div class="segmented mb-5 overflow-x-auto">${[['input','Input Presensi'],['history','Riwayat'],['dashboard','Dashboard'],['hasda','Teks Susulan']].map(x=>`<button class="segment ${this.tab===x[0]?'active':''}" onclick="Presensi.switchTab('${x[0]}')">${x[1]}</button>`).join('')}</div><div id="presensiContent"></div></div>`;this.switchTab(this.tab,false);if(window.lucide)lucide.createIcons();},
  switchTab(tab,reset=true){this.tab=tab;document.querySelectorAll('.segment').forEach((b,i)=>b.classList.toggle('active',['input','history','dashboard','hasda'][i]===tab));if(tab==='input')this.input();if(tab==='history')this.history();if(tab==='dashboard')this.dashboard();if(tab==='hasda')this.hasda();},
  async input(){
    const host=document.getElementById('presensiContent');host.innerHTML=`<div class="grid gap-4 lg:grid-cols-[280px_1fr]"><aside class="card h-fit p-5"><div class="space-y-4"><div><label class="text-sm">Tanggal</label><input id="presensiTanggal" type="date" class="input mt-1" value="${new Date().toISOString().slice(0,10)}"></div><div><label class="text-sm">Jenis Pengajian</label><select id="presensiJenis" class="select mt-1" onchange="Presensi.onJenis()"><option>Pengajian Umum</option><option>Pengajian Ibu-Ibu</option><option>Pembinaan Generus</option></select></div><div id="kelasWrap" class="hidden"><label class="text-sm">Kelas Generus</label><select id="presensiKelas" class="select mt-1"><option>SMP</option><option>SMA</option><option>PN</option></select></div><label id="hasdaWrap" class="flex items-center gap-2 text-sm"><input id="presensiHasda" type="checkbox" class="h-4 w-4 accent-[#667F6E]">HASDA</label><button class="btn-primary w-full admin-only" onclick="Presensi.loadJamaah()">Tampilkan Jamaah</button></div></aside><section class="card p-4"><div class="mb-3 flex items-center justify-between"><h2 class="font-semibold">Daftar Kehadiran</h2><span id="presensiCount" class="text-xs text-muted"></span></div><div id="presensiList" class="space-y-2"><div class="py-12 text-center text-muted">Pilih jenis pengajian lalu tampilkan daftar.</div></div><button id="savePresensi" class="btn-primary mt-4 admin-only hidden" onclick="Presensi.save()">Simpan Presensi</button></section></div>`;
    if(!Auth.isAdmin())document.querySelectorAll('.admin-only').forEach(el=>el.classList.add('hide-for-role'));
  },
  onJenis(){const jenis=document.getElementById('presensiJenis').value;document.getElementById('kelasWrap').classList.toggle('hidden',jenis!=='Pembinaan Generus');document.getElementById('hasdaWrap').classList.toggle('hidden',jenis!=='Pengajian Umum');},
  async loadJamaah(){
    const jenis=document.getElementById('presensiJenis').value;
    let q=supabaseClient.from('jamaah').select('*').order('nama_lengkap');
    if(jenis==='Pengajian Ibu-Ibu')q=q.eq('jenis_kelamin','Perempuan');
    if(jenis==='Pembinaan Generus'){const kelas=document.getElementById('presensiKelas').value;if(kelas==='PN')q=q.eq('kelompok_umur','Pra Nikah');else q=q.eq('kelompok_umur',kelas);}
    App.showLoading(true);const {data,error}=await q;App.showLoading(false);
    if(error){App.toast(error.message);return;}
    document.getElementById('presensiList').innerHTML=(data||[]).map(r=>`<div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFEAE2] py-3"><div><p class="font-medium">${r.nama_lengkap}</p><p class="text-xs text-muted">${r.kelompok_umur||'-'} · ${r.status_pernikahan||'-'}</p></div><div class="segmented"><label class="segment"><input type="radio" name="${r.id}" value="Hadir" class="mr-1" checked>Hadir</label><label class="segment"><input type="radio" name="${r.id}" value="Tidak Hadir" class="mr-1">Tidak</label><label class="segment"><input type="radio" name="${r.id}" value="Izin" class="mr-1">Izin</label></div></div>`).join('')||'<div class="py-10 text-center text-muted">Belum ada jamaah sesuai kategori</div>';
    document.getElementById('presensiCount').textContent=`${data?.length||0} jamaah`;
    if(Auth.isAdmin())document.getElementById('savePresensi').classList.remove('hidden');
  },
  async save(){
    const jenis=document.getElementById('presensiJenis').value;
    const payload={tanggal:document.getElementById('presensiTanggal').value,jenis_pengajian:jenis,kelas_generus:jenis==='Pembinaan Generus'?document.getElementById('presensiKelas').value:null,is_hasda:jenis==='Pengajian Umum'?document.getElementById('presensiHasda').checked:false};
    App.showLoading(true);const {data:sesi,error:sError}=await supabaseClient.from('presensi_sesi').insert(payload).select().single();
    if(sError){App.showLoading(false);App.toast(sError.message);return;}
    const details=[...document.querySelectorAll('#presensiList input[type="radio"]:checked')].map(r=>({sesi_id:sesi.id,jamaah_id:r.name,status:r.value}));
    const {error}=await supabaseClient.from('presensi_detail').insert(details);App.showLoading(false);
    if(error)App.toast(error.message);else{App.toast('Presensi berhasil disimpan');document.getElementById('savePresensi').classList.add('hidden');}
  },
  async history(){
    const host=document.getElementById('presensiContent');host.innerHTML=`<div class="card mb-4 p-4"><div class="grid gap-3 md:grid-cols-4"><input id="historyMonth" type="month" class="input" onchange="Presensi.loadHistory()"><select id="historyJenis" class="select" onchange="Presensi.loadHistory()"><option value="">Semua Jenis</option><option>Pengajian Umum</option><option>Pengajian Ibu-Ibu</option><option>Pembinaan Generus</option></select><select id="historyKelas" class="select" onchange="Presensi.loadHistory()"><option value="">Semua Kelas</option><option>SMP</option><option>SMA</option><option>PN</option></select><button class="btn-secondary" onclick="Presensi.exportHistory()">Export Excel</button></div></div><div class="card table-wrap p-2"><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Kelas</th><th>Hadir</th><th>Total</th><th>HASDA</th></tr></thead><tbody id="historyRows"></tbody></table></div>`;
    await this.loadHistory();
  },
  async loadHistory(){
    let q=supabaseClient.from('presensi_sesi').select('*,presensi_detail(status)').order('tanggal',{ascending:false});
    const month=document.getElementById('historyMonth')?.value,jenis=document.getElementById('historyJenis')?.value,kelas=document.getElementById('historyKelas')?.value;
    if(month){q=q.gte('tanggal',month+'-01').lte('tanggal',month+'-31');}if(jenis)q=q.eq('jenis_pengajian',jenis);if(kelas)q=q.eq('kelas_generus',kelas);
    App.showLoading(true);const {data,error}=await q;App.showLoading(false);if(error){App.toast(error.message);return;}
    this.historyData=data||[];document.getElementById('historyRows').innerHTML=this.historyData.map(r=>{const d=r.presensi_detail||[];return `<tr><td>${r.tanggal}</td><td>${r.jenis_pengajian}</td><td>${r.kelas_generus||'-'}</td><td>${d.filter(x=>x.status==='Hadir').length}</td><td>${d.length}</td><td>${r.is_hasda?'Ya':'-'}</td></tr>`}).join('')||'<tr><td colspan="6" class="py-8 text-center text-muted">Tidak ada riwayat</td></tr>';
  },
  exportHistory(){const rows=(this.historyData||[]).map(r=>({Tanggal:r.tanggal,Jenis:r.jenis_pengajian,Kelas:r.kelas_generus||'',Hadir:(r.presensi_detail||[]).filter(x=>x.status==='Hadir').length,Total:r.presensi_detail?.length||0,HASDA:r.is_hasda?'Ya':'Tidak'}));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Presensi');XLSX.writeFile(wb,'riwayat_presensi.xlsx');},
  async dashboard(){
    const host=document.getElementById('presensiContent');host.innerHTML=`<div id="dashboardExportArea"><div class="card mb-4 p-4"><div class="grid gap-3 md:grid-cols-3"><select id="dashJenis" class="select"><option value="">Semua Jenis</option><option>Pengajian Umum</option><option>Pengajian Ibu-Ibu</option><option>Pembinaan Generus</option></select><input id="dashMonth" type="month" class="input"><button class="btn-secondary" onclick="Presensi.loadDashboard()">Terapkan Filter</button></div></div><section class="mb-4 grid gap-4 md:grid-cols-3"><div class="card p-5"><p class="text-sm text-muted">Jamaah Berkewajiban</p><p id="dashRequired" class="mt-2 text-3xl font-light">0</p></div><div class="card p-5"><p class="text-sm text-muted">Jumlah Hadir</p><p id="dashPresent" class="mt-2 text-3xl font-light">0</p></div><div class="card p-5"><p class="text-sm text-muted">Persentase Kehadiran</p><p id="dashPercent" class="mt-2 text-3xl font-light">0%</p></div></section><section class="mb-4 grid gap-4 lg:grid-cols-[1.4fr_.6fr]"><div class="card p-5"><canvas id="barChart"></canvas></div><div class="card p-5"><canvas id="donutChart"></canvas></div></section><div class="card p-4"><div class="mb-3 flex flex-wrap justify-between gap-3"><h2 class="font-semibold">Rekap Per Nama Jamaah</h2><select id="attendanceFilter" class="select max-w-[180px]" onchange="Presensi.filterAttendance()"><option value="all">Semua</option><option value="80">&gt;80%</option><option value="50">50-80%</option><option value="low">&lt;50%</option></select></div><div class="table-wrap"><table><thead><tr><th>Nama</th><th>Hadir</th><th>Total Sesi</th><th>Persentase</th></tr></thead><tbody id="attendanceRows"></tbody></table></div></div></div><div class="mt-4 flex gap-2"><button class="btn-secondary flex items-center gap-2" onclick="Presensi.sharePNG()"><i data-lucide="image" class="h-4"></i>Share PNG</button><button class="btn-primary flex items-center gap-2" onclick="Presensi.exportPDF()"><i data-lucide="file-down" class="h-4"></i>Ekspor PDF</button></div>`;
    await this.loadDashboard();
  },
  async loadDashboard(){
    let q=supabaseClient.from('presensi_sesi').select('*,presensi_detail(status,jamaah_id,jamaah(nama_lengkap))').order('tanggal');
    const month=document.getElementById('dashMonth')?.value,jenis=document.getElementById('dashJenis')?.value;
    if(month){q=q.gte('tanggal',month+'-01').lte('tanggal',month+'-31');}if(jenis)q=q.eq('jenis_pengajian',jenis);
    App.showLoading(true);const {data,error}=await q;App.showLoading(false);if(error){App.toast(error.message);return;}
    const sessions=data||[], details=sessions.flatMap(s=>s.presensi_detail||[]);
    const present=details.filter(d=>d.status==='Hadir').length, required=details.length, percent=required?Math.round(present/required*100):0;
    document.getElementById('dashRequired').textContent=required;document.getElementById('dashPresent').textContent=present;document.getElementById('dashPercent').textContent=percent+'%';
    const names={};details.forEach(d=>{const n=d.jamaah?.nama_lengkap||'Tidak diketahui';if(!names[n])names[n]={present:0,total:0};names[n].total++;if(d.status==='Hadir')names[n].present++;});
    this.attendanceData=Object.entries(names).map(([name,v])=>({name,...v,pct:v.total?Math.round(v.present/v.total*100):0}));
    this.filterAttendance();
    const groups={};sessions.forEach(s=>{groups[s.tanggal]=(groups[s.tanggal]||{required:0,present:0});const ds=s.presensi_detail||[];groups[s.tanggal].required+=ds.length;groups[s.tanggal].present+=ds.filter(d=>d.status==='Hadir').length;});
    const labels=Object.keys(groups).sort();
    if(this.barChart)this.barChart.destroy();if(this.donutChart)this.donutChart.destroy();
    this.barChart=new Chart(document.getElementById('barChart'),{type:'bar',data:{labels, datasets:[{label:'Hadir',data:labels.map(l=>groups[l].present),backgroundColor:'#667F6E'},{label:'Total',data:labels.map(l=>groups[l].required),backgroundColor:'#D9DFD9'}]},options:{responsive:true,plugins:{legend:{position:'bottom'}}}});
    this.donutChart=new Chart(document.getElementById('donutChart'),{type:'doughnut',data:{labels:['Hadir','Tidak/Izin'],datasets:[{data:[present,required-present],backgroundColor:['#667F6E','#C9BDAF']}]},options:{responsive:true,plugins:{legend:{position:'bottom'}}}});
  },
  filterAttendance(){const filter=document.getElementById('attendanceFilter')?.value||'all';const rows=(this.attendanceData||[]).filter(r=>filter==='80'?r.pct>80:filter==='50'?r.pct>=50&&r.pct<=80:filter==='low'?r.pct<50:true);document.getElementById('attendanceRows').innerHTML=rows.map(r=>`<tr><td>${r.name}</td><td>${r.present}</td><td>${r.total}</td><td>${r.pct}%</td></tr>`).join('')||'<tr><td colspan="4" class="py-8 text-center text-muted">Belum ada data</td></tr>';},
  async sharePNG(){const el=document.getElementById('dashboardExportArea');const canvas=await html2canvas(el,{scale:2,backgroundColor:'#F4EFE8'});const a=document.createElement('a');a.download='dashboard-presensi.png';a.href=canvas.toDataURL('image/png');a.click();},
  async exportPDF(){const el=document.getElementById('dashboardExportArea');const canvas=await html2canvas(el,{scale:2,backgroundColor:'#F4EFE8'});const {jsPDF}=window.jspdf;const pdf=new jsPDF('p','mm','a4');const w=190,h=canvas.height*w/canvas.width;pdf.addImage(canvas.toDataURL('image/png'),'PNG',10,10,w,h>250?250:h);pdf.save('dashboard-presensi.pdf');},
  async hasda(){
    const host=document.getElementById('presensiContent');host.innerHTML=`<div class="card mb-4 p-4"><div class="grid max-w-xl gap-3 md:grid-cols-2"><input id="hasdaMonth" type="month" class="input" onchange="Presensi.loadHasda()"><button class="btn-primary" onclick="Presensi.loadHasda()">Tampilkan</button></div></div><div class="card p-5"><div class="mb-4 flex items-center justify-between"><h2 class="font-semibold">Daftar Jamaah Tidak Hadir</h2><button class="btn-secondary flex items-center gap-2" onclick="Presensi.copyHasda()"><i data-lucide="copy" class="h-4"></i>Copy Teks</button></div><div id="hasdaText" class="rounded-xl border border-[#E6E0D6] bg-[#F7F4EF] p-4 text-sm whitespace-pre-line"></div><div id="hasdaNames" class="mt-4 space-y-2"></div></div>`;
    await this.loadHasda();if(window.lucide)lucide.createIcons();
  },
  async loadHasda(){
    const month=document.getElementById('hasdaMonth')?.value;let q=supabaseClient.from('presensi_sesi').select('tanggal,presensi_detail(status,jamaah(nama_lengkap))').eq('jenis_pengajian','Pengajian Umum').eq('is_hasda',true);
    if(month){q=q.gte('tanggal',month+'-01').lte('tanggal',month+'-31');}
    App.showLoading(true);const {data,error}=await q;App.showLoading(false);if(error){App.toast(error.message);return;}
    const absent=[];(data||[]).forEach(s=>(s.presensi_detail||[]).forEach(d=>{if(d.status==='Tidak Hadir'&&d.jamaah?.nama_lengkap&&!absent.includes(d.jamaah.nama_lengkap))absent.push(d.jamaah.nama_lengkap);}));
    document.getElementById('hasdaNames').innerHTML=absent.map(n=>`<div class="border-b border-[#EFEAE2] py-2">${n}</div>`).join('')||'<p class="text-muted">Tidak ada jamaah tidak hadir.</p>';
    this.hasdaText=`Teks Susulan HASDA\n\nAssalamu'alaikum, nama jamaah yang tidak hadir pada Pengajian Umum HASDA:\n\n${absent.map((n,i)=>`${i+1}. ${n}`).join('\n')}\n\nMohon ditindaklanjuti oleh pengurus.`;
    document.getElementById('hasdaText').textContent=this.hasdaText;
  },
  async copyHasda(){if(!this.hasdaText)return;await navigator.clipboard.writeText(this.hasdaText);App.toast('Teks HASDA disalin');}
};
