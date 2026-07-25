
(function() {

	var FLAG_MOVE = 0x10000, FLAG_CAPTURE = 0x20000, FLAG_STOP = 0x40000;

	// Exact surface topology of a size^3 cube, derived from the SAME face
	// placement table used by cubic-board-view, so model and view agree.
	// walls: face-pair labels ("01","04","15","45") that pieces cannot cross.
	Model.Game.cbBoardGeometryCubic = function(width, height, floors, walls) {

		var SZ = width;
		if(height !== width || floors !== width)
			console.warn("cubic geometry expects a cube; got", width, height, floors);

		var boardSize = 6*SZ*SZ;
		var planes = [];
		for(var pi=0; pi<6; pi++) planes.push({ cols:SZ, rows:SZ, start:pi*SZ*SZ });

		// face orientations (unit basis; matches cubic-board-view orients dx/dy/dz)
		var O = [
			{ tX:0,    tY:0,    tZ:-SZ/2, dx:[1,0],  dy:[0,1],  dz:[0,0]  },
			{ tX:-SZ/2,tY:0,    tZ:0,     dx:[0,0],  dy:[1,0],  dz:[0,1]  },
			{ tX:0,    tY:SZ/2, tZ:0,     dx:[1,0],  dy:[0,0],  dz:[0,1]  },
			{ tX:0,    tY:-SZ/2,tZ:0,     dx:[-1,0], dy:[0,0],  dz:[0,1]  },
			{ tX:SZ/2, tY:0,    tZ:0,     dx:[0,0],  dy:[-1,0], dz:[0,1]  },
			{ tX:0,    tY:0,    tZ:SZ/2,  dx:[1,0],  dy:[0,-1], dz:[0,0]  }
		];

		function P(pos){ return Math.floor(pos/(SZ*SZ)); }
		function locC(pos){ return pos % SZ; }
		function locR(pos){ return Math.floor((pos % (SZ*SZ)) / SZ); }
		function POSf(pi,c,r){ return pi*SZ*SZ + r*SZ + c; }              // internal (face,col,row)
		function POS(c,r,f){ return f*SZ*SZ + r*SZ + c; }                // public: matches the view's POS(col,row,face)

		function center(pos){
			var pi=P(pos), o=O[pi], xb=(locC(pos)-(SZ-1)/2), yb=(locR(pos)-(SZ-1)/2);
			return [ -o.tX - xb*o.dx[0] - yb*o.dx[1],
			         -o.tY - xb*o.dy[0] - yb*o.dy[1],
			         -o.tZ - xb*o.dz[0] - yb*o.dz[1] ];
		}
		function u(v){ var n=Math.hypot(v[0],v[1],v[2]); return [v[0]/n,v[1]/n,v[2]/n]; }
		function basis(pi){ var o=O[pi]; return [ u([-o.dx[0],-o.dy[0],-o.dz[0]]), u([-o.dx[1],-o.dy[1],-o.dz[1]]) ]; }
		function sub(a,b){ return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]; }
		function dot(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
		function nrm(a){ return Math.hypot(a[0],a[1],a[2]); }

		var CTR=[]; for(var p=0;p<boardSize;p++) CTR.push(center(p));

		var FOLD=[]; for(var i=0;i<boardSize;i++) FOLD.push([]);
		for(var a=0;a<boardSize;a++) for(var b=0;b<boardSize;b++){
			if(P(a)===P(b)) continue;
			if(Math.abs(nrm(sub(CTR[a],CTR[b]))-Math.SQRT1_2)<1e-9) FOLD[a].push(b);
		}
		function edgeLabel(a,b){ var x=[P(a),P(b)].sort(); return ""+x[0]+x[1]; }

		function localOf(pi,dir){ var B=basis(pi); return [Math.round(dot(dir,B[0])), Math.round(dot(dir,B[1]))]; }
		function dirVec(pi,ca,rb){ var B=basis(pi); return u([B[0][0]*ca+B[1][0]*rb, B[0][1]*ca+B[1][1]*rb, B[0][2]*ca+B[1][2]*rb]); }

		// one orthogonal surface step, transporting direction across a fold; null at cube vertex
		function ostep(pos, dir){
			var pi=P(pos), l=localOf(pi,dir), ca=l[0], rb=l[1];
			var nc=locC(pos)+ca, nr=locR(pos)+rb;
			var inC=(nc>=0&&nc<SZ), inR=(nr>=0&&nr<SZ);
			if(inC&&inR) return { pos:POSf(pi,nc,nr), dir:dir, edge:null };
			if(!inC&&!inR) return null;
			var best=-1,bd=-2;
			for(var k=0;k<FOLD[pos].length;k++){ var q=FOLD[pos][k];
				var al=dot(u(sub(CTR[q],CTR[pos])), dir); if(al>bd){bd=al;best=q;} }
			if(best<0||bd<0.5) return null;
			var pj=P(best), nl=localOf(pj,u(sub(CTR[best],CTR[pos])));
			return { pos:best, dir:dirVec(pj,nl[0],nl[1]), edge:edgeLabel(pos,best) };
		}
		function projSnap(pi,v){
			var B=basis(pi), n=u([B[0][1]*B[1][2]-B[0][2]*B[1][1], B[0][2]*B[1][0]-B[0][0]*B[1][2], B[0][0]*B[1][1]-B[0][1]*B[1][0]]);
			var t=[v[0]-n[0]*dot(v,n), v[1]-n[1]*dot(v,n), v[2]-n[2]*dot(v,n)], nl=localOf(pi,t);
			return dirVec(pi,nl[0],nl[1]);
		}
		// diagonal step = two orthogonal steps, transporting both axes; null at cube vertex
		function dstep(pos, e1, e2){
			var s1=ostep(pos,e1); if(!s1) return null;
			var s2=ostep(s1.pos, s1.edge?projSnap(P(s1.pos),e2):e2); if(!s2) return null;
			var t1=ostep(pos,e2); if(!t1) return null;
			var t2=ostep(t1.pos, t1.edge?projSnap(P(t1.pos),e1):e1);
			if(!t2 || t2.pos!==s2.pos) return null; // vertex singularity: stop
			return { pos:s2.pos, e1:(s2.edge?projSnap(P(s2.pos),s1.dir):s1.dir), e2:s2.dir, edges:[s1.edge,s2.edge].filter(Boolean) };
		}

		var WALLS = {}; (walls||[]).forEach(function(w){ WALLS[w]=true; });
		function wallHit(edge){ return edge && WALLS[edge]; }

		function orthoDirs(pi){ return [ dirVec(pi,1,0), dirVec(pi,-1,0), dirVec(pi,0,1), dirVec(pi,0,-1) ]; }
		function diagPairs(pi){
			return [ [dirVec(pi,1,0),dirVec(pi,0,1)], [dirVec(pi,1,0),dirVec(pi,0,-1)],
			         [dirVec(pi,-1,0),dirVec(pi,0,1)], [dirVec(pi,-1,0),dirVec(pi,0,-1)] ];
		}
		function orthoRay(pos, dir){
			var out=[], st={pos:pos,dir:dir}, guard=0;
			while(guard++ < boardSize){
				var nx=ostep(st.pos, st.dir); if(!nx || wallHit(nx.edge) || nx.pos===pos) break;
				out.push(nx.pos); st=nx;
			}
			return out;
		}
		function diagRay(pos, e1, e2){
			var out=[], st={pos:pos,e1:e1,e2:e2}, guard=0;
			while(guard++ < boardSize){
				var nx=dstep(st.pos, st.e1, st.e2);
				if(!nx || nx.edges.some(wallHit) || nx.pos===pos) break;
				out.push(nx.pos); st=nx;
			}
			return out;
		}
		function orthoNbr(pos, dir){ var nx=ostep(pos,dir); return (!nx||wallHit(nx.edge))?null:nx; }
		function diagNbr(pos, e1, e2){ var nx=dstep(pos,e1,e2); return (!nx||nx.edges.some(wallHit))?null:nx; }

		// ---- pawn "forward" field: BFS potential toward each pole face ----
		// pole faces: 0 (panel 1, White home) and 5 (panel 6, Black home).
		function bfsFrom(seedFaces){
			var d=new Array(boardSize).fill(-1), q=[];
			for(var pp=0;pp<boardSize;pp++) if(seedFaces.indexOf(P(pp))>=0){ d[pp]=0; q.push(pp); }
			while(q.length){ var x=q.shift();
				orthoDirs(P(x)).forEach(function(dir){ var nx=orthoNbr(x,dir);
					if(nx && d[nx.pos]<0){ d[nx.pos]=d[x]+1; q.push(nx.pos); } }); }
			return d;
		}
		var dNorth=bfsFrom([0]), dSouth=bfsFrom([5]);
		// signed "height" along the meridian: -SZ deep in White home (face0) .. +SZ deep in Black home (face5)
		function H(pos){ return dNorth[pos]-dSouth[pos]; }
		// White (+1) climbs H toward face5; Black (-1) descends toward face0. Forward = steepest orthogonal step.
		function pawnForward(pos, side){
			var pi=P(pos), best=null, bestScore=0;
			orthoDirs(pi).forEach(function(dir){ var nx=orthoNbr(pos,dir); if(!nx) return;
				var score = side>0 ? (H(nx.pos)-H(pos)) : (H(pos)-H(nx.pos));
				if(score>bestScore){ bestScore=score; best={dir:dir,nx:nx}; } });
			return best; // null if no strictly-advancing step (pawn cannot move forward)
		}
		// forward-diagonal captures: the diagonal neighbours that also advance in H
		function pawnCaptures(pos, side){
			var pi=P(pos), caps=[];
			diagPairs(pi).forEach(function(pr){ var nx=diagNbr(pos,pr[0],pr[1]); if(!nx) return;
				var score = side>0 ? (H(nx.pos)-H(pos)) : (H(pos)-H(nx.pos));
				if(score>0) caps.push(nx.pos); });
			return caps;
		}

		function PosName(pos){ return ""+(P(pos)+1)+String.fromCharCode(65+locR(pos))+(locC(pos)+1); }
		function PosByName(str){ var m=/^([1-6])([A-D])([1-4])$/.exec((str||"").toUpperCase());
			return m ? POSf(parseInt(m[1])-1, parseInt(m[3])-1, m[2].charCodeAt(0)-65) : -1; }
		function CompactCrit(pos,index){
			if(index===0) return ""+(P(pos)+1);
			if(index===1) return String.fromCharCode(65+locR(pos));
			if(index===2) return ""+(locC(pos)+1);
			return null;
		}
		function Graph(pos,delta){ var pi=P(pos), c=locC(pos)+delta[0], r=locR(pos)+delta[1];
			return (c<0||c>=SZ||r<0||r>=SZ)?null:POSf(pi,c,r); }

		var distEdges={}; for(var q0=0;q0<boardSize;q0++) distEdges[q0]=1;
		var distance={}; for(var d1=0;d1<boardSize;d1++){ distance[d1]={}; for(var d2=0;d2<boardSize;d2++) distance[d1][d2]=(d1===d2?0:1); }

		return {
			boardSize: boardSize, width: SZ, height: SZ, depth: SZ, cube:true, walls: WALLS,
			fences: (walls||[]).slice(),
			planes: planes,
			P:P, C:locC, R:locR, F:P, POS:POS, Graph:Graph,
			PosName:PosName, PosByName:PosByName, CompactCrit:CompactCrit,
			GetDistances:function(){return distance;}, distEdge:distEdges, corners:null,
			orthoDirs:orthoDirs, diagPairs:diagPairs, orthoRay:orthoRay, diagRay:diagRay,
			orthoNbr:orthoNbr, diagNbr:diagNbr, ostep:ostep, dstep:dstep, dirVec:dirVec,
			pawnForward:pawnForward, pawnCaptures:pawnCaptures, dNorth:dNorth, dSouth:dSouth,
			FLAGS:{ MOVE:FLAG_MOVE, CAPTURE:FLAG_CAPTURE, STOP:FLAG_STOP }
		};
	};

	// ---------- cube-aware piece graph builders ----------
	function typed(self,arr){ return self.cbTypedArray ? self.cbTypedArray(arr) : arr; }

	Model.Game.cbCubicRookGraph = function(geometry){
		var C=this.cbConstants, MC=C.FLAG_MOVE|C.FLAG_CAPTURE, self=this, g={};
		for(var pos=0;pos<geometry.boardSize;pos++){ g[pos]=[];
			geometry.orthoDirs(geometry.P(pos)).forEach(function(dir){
				var ray=geometry.orthoRay(pos,dir), line=[];
				for(var i=0;i<ray.length;i++) line.push(ray[i]|MC);
				if(line.length) g[pos].push(typed(self,line));
			}); }
		return g;
	};
	Model.Game.cbCubicBishopGraph = function(geometry){
		var C=this.cbConstants, MC=C.FLAG_MOVE|C.FLAG_CAPTURE, self=this, g={};
		for(var pos=0;pos<geometry.boardSize;pos++){ g[pos]=[];
			geometry.diagPairs(geometry.P(pos)).forEach(function(pr){
				var ray=geometry.diagRay(pos,pr[0],pr[1]), line=[];
				for(var i=0;i<ray.length;i++) line.push(ray[i]|MC);
				if(line.length) g[pos].push(typed(self,line));
			}); }
		return g;
	};
	Model.Game.cbCubicQueenGraph = function(geometry){
		return this.cbMergeGraphs(geometry, this.cbCubicRookGraph(geometry), this.cbCubicBishopGraph(geometry));
	};
	Model.Game.cbCubicKingGraph = function(geometry){
		var C=this.cbConstants, MC=C.FLAG_MOVE|C.FLAG_CAPTURE, self=this;
		var seen=[]; for(var i=0;i<geometry.boardSize;i++) seen.push({});
		for(var pos=0;pos<geometry.boardSize;pos++){
			geometry.orthoDirs(geometry.P(pos)).forEach(function(dir){ var nx=geometry.orthoNbr(pos,dir); if(nx) seen[pos][nx.pos]=1; });
			geometry.diagPairs(geometry.P(pos)).forEach(function(pr){ var nx=geometry.diagNbr(pos,pr[0],pr[1]); if(nx) seen[pos][nx.pos]=1; });
		}
		for(var a=0;a<geometry.boardSize;a++) for(var b in seen[a]) seen[b][a]=1; // symmetric adjacency
		var g={};
		for(var p2=0;p2<geometry.boardSize;p2++){ g[p2]=[];
			for(var t in seen[p2]) g[p2].push(typed(self,[(t|0)|MC])); }
		return g;
	};
	function perpDirs(geometry, dir, pi){
		var out=[]; geometry.orthoDirs(pi).forEach(function(d){
			if(Math.abs(d[0]*dir[0]+d[1]*dir[1]+d[2]*dir[2])<0.5) out.push(d); });
		return out;
	}
	Model.Game.cbCubicKnightGraph = function(geometry){
		var C=this.cbConstants, MC=C.FLAG_MOVE|C.FLAG_CAPTURE, self=this;
		// targets[pos] = set of reachable cells via a wall-free L-path (2+1 and 1+2 decompositions)
		var targets=[]; for(var i=0;i<geometry.boardSize;i++) targets.push({});
		for(var pos=0;pos<geometry.boardSize;pos++){
			geometry.orthoDirs(geometry.P(pos)).forEach(function(dir){
				// long axis = 2 steps along dir, then 1 step perpendicular
				var s1=geometry.orthoNbr(pos,dir);
				if(s1){ var s2=geometry.orthoNbr(s1.pos,s1.dir);
					if(s2) perpDirs(geometry, s2.dir, geometry.P(s2.pos)).forEach(function(pd){
						var s3=geometry.orthoNbr(s2.pos,pd); if(s3 && s3.pos!==pos) targets[pos][s3.pos]=1; });
					// short axis = 1 step along dir, then 2 steps perpendicular
					perpDirs(geometry, s1.dir, geometry.P(s1.pos)).forEach(function(pd){
						var t1=geometry.orthoNbr(s1.pos,pd); if(!t1) return;
						var t2=geometry.orthoNbr(t1.pos,t1.dir); if(t2 && t2.pos!==pos) targets[pos][t2.pos]=1; });
				}
			});
		}
		// symmetrise: a (2,1) leaper relation on a cube is symmetric; vertex path-drops break it
		for(var a=0;a<geometry.boardSize;a++) for(var b in targets[a]) targets[b][a]=1;
		var g={};
		for(var p2=0;p2<geometry.boardSize;p2++){ g[p2]=[];
			for(var t in targets[p2]) g[p2].push(typed(self,[(t|0)|MC])); }
		return g;
	};
	// pawn: forward (FLAG_MOVE) + two diagonal captures (FLAG_CAPTURE); side +1 white / -1 black
	Model.Game.cbCubicPawnGraph = function(geometry, side){
		var C=this.cbConstants, self=this, g={};
		for(var pos=0;pos<geometry.boardSize;pos++){ g[pos]=[];
			var fw=geometry.pawnForward(pos, side);
			if(fw) g[pos].push(typed(self,[fw.nx.pos|C.FLAG_MOVE]));
			geometry.pawnCaptures(pos, side).forEach(function(cp){ g[pos].push(typed(self,[cp|C.FLAG_CAPTURE])); });
		}
		return g;
	};
	// initial pawn: forward one or two (FLAG_MOVE) + captures
	Model.Game.cbCubicInitialPawnGraph = function(geometry, side){
		var C=this.cbConstants, self=this, g={};
		for(var pos=0;pos<geometry.boardSize;pos++){ g[pos]=[];
			var fw=geometry.pawnForward(pos, side);
			if(fw){ var line=[fw.nx.pos|C.FLAG_MOVE];
				var fw2=geometry.pawnForward(fw.nx.pos, side);
				if(fw2) line.push(fw2.nx.pos|C.FLAG_MOVE);
				g[pos].push(typed(self,line));
			}
			geometry.pawnCaptures(pos, side).forEach(function(cp){ g[pos].push(typed(self,[cp|C.FLAG_CAPTURE])); });
		}
		return g;
	};

})();
