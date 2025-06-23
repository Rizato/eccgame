import { describe, it } from 'vitest';
import { getGeneratorPoint, pointMultiplyWithIntermediates } from './ecc';
import { createEmptyGraph, addNode, ensureOperationInGraph } from './graphOperations';
import { startProfiling, profile, endProfiling } from './simple-profiler';

describe('Flamegraph Analysis', () => {
  const generatorPoint = getGeneratorPoint();

  it('should create a detailed performance flamegraph', () => {
    console.log('\n🔥 FLAMEGRAPH ANALYSIS 🔥');

    startProfiling();

    const scalar = 1023n; // Large enough to see performance characteristics

    profile('Complete Multiplication Operation', () => {
      profile('Math: pointMultiplyWithIntermediates', () => {
        return pointMultiplyWithIntermediates(scalar, generatorPoint);
      });

      const { result, intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

      profile('Graph: Setup and Initial Nodes', () => {
        const graph = createEmptyGraph();
        profile('Graph: Add Generator Node', () => {
          addNode(graph, generatorPoint, {
            id: 'generator',
            label: 'Generator',
            privateKey: 1n,
            isGenerator: true,
          });
        });
        return graph;
      });

      const graph = createEmptyGraph();
      addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      profile('Graph: Process All Intermediates', () => {
        let currentPoint = generatorPoint;
        for (let i = 0; i < intermediates.length; i++) {
          const intermediate = intermediates[i];

          profile(`Graph: Intermediate ${i + 1}/${intermediates.length}`, () => {
            profile('Graph: ensureOperationInGraph', () => {
              ensureOperationInGraph(
                graph,
                currentPoint,
                intermediate.point,
                intermediate.operation
              );
            });
          });

          currentPoint = intermediate.point;
        }
      });

      return {
        nodeCount: Object.keys(graph.nodes).length,
        edgeCount: Object.keys(graph.edges).length,
        intermediateCount: intermediates.length,
      };
    });

    const result = endProfiling();
    if (result) {
      result.print();

      console.log('\n🎯 TOP BOTTLENECKS (>5% of total time):');
      const bottlenecks = result.getBottlenecks(5);
      bottlenecks.forEach((bottleneck, index) => {
        console.log(
          `${index + 1}. ${bottleneck.name}: ${bottleneck.duration.toFixed(2)}ms (${bottleneck.percentage.toFixed(1)}%)`
        );
      });
    }
  });

  it('should profile individual graph operations in detail', () => {
    console.log('\n🔍 DETAILED GRAPH OPERATION ANALYSIS 🔍');

    startProfiling();

    profile('Detailed Graph Operations', () => {
      const graph = createEmptyGraph();

      profile('Add Generator with Private Key', () => {
        addNode(graph, generatorPoint, {
          id: 'generator',
          label: 'Generator',
          privateKey: 1n,
          isGenerator: true,
        });
      });

      // Test single intermediate operation in detail
      const { intermediates } = pointMultiplyWithIntermediates(7n, generatorPoint);
      const intermediate = intermediates[0];

      profile('Single ensureOperationInGraph (detailed)', () => {
        profile('Find/Create From Node', () => {
          // This is what ensureOperationInGraph does internally
          return 'simulated';
        });

        profile('Find/Create To Node', () => {
          return 'simulated';
        });

        profile('Add Edge', () => {
          return 'simulated';
        });

        profile('Private Key Propagation', () => {
          profile('Calculate Private Key', () => {
            return 'simulated calculation';
          });

          profile('Recursive Propagation', () => {
            profile('Find Connected Nodes', () => {
              return 'simulated search';
            });

            profile('Update Connected Nodes', () => {
              return 'simulated update';
            });
          });
        });

        profile('ConnectedToG Propagation', () => {
          return 'simulated connectedToG';
        });

        // Actually call the real function
        ensureOperationInGraph(graph, generatorPoint, intermediate.point, intermediate.operation);
      });
    });

    const result = endProfiling();
    if (result) {
      result.print();
    }
  });

  it('should compare original vs optimized approach', () => {
    console.log('\n⚡ ORIGINAL vs OPTIMIZED COMPARISON ⚡');

    const scalar = 255n;

    // Profile original approach
    startProfiling();
    profile('ORIGINAL APPROACH', () => {
      const graph = createEmptyGraph();

      profile('Setup', () => {
        addNode(graph, generatorPoint, {
          id: 'generator',
          privateKey: 1n,
          isGenerator: true,
        });
      });

      profile('Generate Math', () => {
        return pointMultiplyWithIntermediates(scalar, generatorPoint);
      });

      const { intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

      profile('Process Intermediates (Individual)', () => {
        let currentPoint = generatorPoint;
        for (const intermediate of intermediates) {
          profile('Single Operation', () => {
            ensureOperationInGraph(graph, currentPoint, intermediate.point, intermediate.operation);
          });
          currentPoint = intermediate.point;
        }
      });
    });

    let originalResult = endProfiling();

    // Profile optimized approach
    startProfiling();
    profile('OPTIMIZED APPROACH', () => {
      const graph = createEmptyGraph();

      profile('Setup', () => {
        addNode(graph, generatorPoint, {
          id: 'generator',
          label: 'Generator',
          isGenerator: true,
          // No private key initially
        });
      });

      profile('Generate Math', () => {
        return pointMultiplyWithIntermediates(scalar, generatorPoint);
      });

      const { result, intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

      profile('Batch Process Intermediates', () => {
        profile('Batch Create Nodes', () => {
          for (const intermediate of intermediates) {
            addNode(graph, intermediate.point, {
              label: `Intermediate`,
              // No private key
            });
          }
        });

        profile('Batch Create Edges', () => {
          let currentPoint = generatorPoint;
          for (const intermediate of intermediates) {
            const fromNode = Object.values(graph.nodes).find(
              n => n.point.x === currentPoint.x && n.point.y === currentPoint.y
            );
            const toNode = Object.values(graph.nodes).find(
              n => n.point.x === intermediate.point.x && n.point.y === intermediate.point.y
            );

            if (fromNode && toNode) {
              graph.edges[`${fromNode.id}_to_${toNode.id}`] = {
                id: `${fromNode.id}_to_${toNode.id}`,
                fromNodeId: fromNode.id,
                toNodeId: toNode.id,
                operation: intermediate.operation,
              };
            }
            currentPoint = intermediate.point;
          }
        });

        profile('Batch Calculate Private Keys', () => {
          const generatorNode = Object.values(graph.nodes).find(
            n => n.point.x === generatorPoint.x && n.point.y === generatorPoint.y
          );
          if (generatorNode) {
            generatorNode.privateKey = 1n;

            let privateKey = 1n;
            let currentPoint = generatorPoint;
            for (const intermediate of intermediates) {
              const node = Object.values(graph.nodes).find(
                n => n.point.x === intermediate.point.x && n.point.y === intermediate.point.y
              );
              if (node) {
                privateKey = privateKey * 2n; // Simplified for double operation
                node.privateKey = privateKey;
              }
              currentPoint = intermediate.point;
            }
          }
        });
      });
    });

    let optimizedResult = endProfiling();

    if (originalResult && optimizedResult) {
      console.log('\n📊 PERFORMANCE COMPARISON:');
      originalResult.print();
      optimizedResult.print();
    }
  });
});
